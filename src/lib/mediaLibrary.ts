/**
 * The creator's media library.
 *
 * There is no library table. The library *is* the object store: everything the
 * app uploads — a chapter video, a lesson recording, a thumbnail, a course
 * cover, a PDF resource, a channel image — is written under `<userId>/…`, so
 * listing that prefix is listing the library. Nothing has to be registered,
 * and nothing can drift out of sync with what is actually stored.
 *
 * Object stores have no folders, only keys that happen to share a prefix. This
 * module is the translation: it reads one level of keys and presents them as
 * folders and files, so a creator can make `Module 1/Week 2` and move things
 * into it the way they would anywhere else.
 *
 * Two prefixes are special because the app writes to them itself — `videos/`
 * for uploads and `recordings/` for the lesson recorder. They are ordinary
 * folders here, just ones that already have a name.
 */
import {
  createCloudFolder,
  deleteFromCloud,
  listCloudObjects,
  moveCloudObject,
  type CloudListItem,
} from "@/lib/cloud-storage";

/** Zero-byte object that keeps an empty folder alive. Mirrored in the edge function. */
export const FOLDER_MARKER = ".keep";

export type MediaKind = "video" | "image" | "audio" | "document" | "other";

export interface MediaFile {
  /** Storage key — unique, and what deletion and moving take. */
  key: string;
  name: string;
  kind: MediaKind;
  publicUrl: string;
  /** Folder path relative to the user's root, "" at the top level. */
  path: string;
  size: number;
  createdAt: string;
}

export interface MediaFolder {
  /** Folder path relative to the user's root, e.g. "videos" or "Module 1/Week 2". */
  path: string;
  /** Last segment, as stored. */
  name: string;
  /** What the sidebar shows — a friendly name for the folders the app creates. */
  label: string;
}

export interface MediaListing {
  folders: MediaFolder[];
  files: MediaFile[];
}

const EXTENSIONS: Record<MediaKind, string[]> = {
  video: ["mp4", "webm", "mov", "m4v", "ogv", "avi", "mkv", "wmv", "flv", "mpg", "mpeg", "3gp"],
  image: ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif", "bmp", "heic", "heif", "tif", "tiff"],
  audio: ["mp3", "wav", "m4a", "aac", "ogg", "oga", "flac", "weba"],
  document: ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "txt", "md", "rtf", "zip"],
  other: [],
};

const KIND_BY_EXTENSION = new Map<string, MediaKind>(
  (Object.entries(EXTENSIONS) as [MediaKind, string[]][]).flatMap(([kind, exts]) =>
    exts.map((ext) => [ext, kind] as [string, MediaKind]),
  ),
);

/**
 * The folders the app writes to on its own, named the way a creator would
 * recognise them. Everything else is shown under whatever name it was given.
 */
const KNOWN_FOLDERS: Record<string, string> = {
  videos: "Video uploads",
  recordings: "Recordings",
  content: "Lesson content",
  thumbnails: "Thumbnails",
  resources: "Lesson resources",
  covers: "Course covers",
  branding: "Branding",
  badges: "Badges",
  channels: "Channels",
  landing: "Landing pages",
  cloud: "Files",
};

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  // A leading dot is the whole name (".keep"), not an extension.
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

/** What kind of media a file name describes, judged on its extension alone. */
export function mediaKindOf(name: string): MediaKind {
  return KIND_BY_EXTENSION.get(extensionOf(name)) ?? "other";
}

/** A folder's display name: friendly for the app's own, verbatim otherwise. */
export function folderLabel(pathOrName: string): string {
  const name = pathOrName.split("/").filter(Boolean).pop() ?? "";
  return KNOWN_FOLDERS[name] ?? name;
}

/**
 * Why this folder name cannot be used, or null when it can.
 *
 * Slashes are the one that matters: a name containing one would create a
 * nested folder the creator did not ask for, at a path they would then have no
 * way to reach.
 */
export function folderNameError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Give the folder a name.";
  if (name.length > 60) return "Folder names are limited to 60 characters.";
  if (name === "." || name === "..") return "That name is reserved.";
  if (name.startsWith(".")) return "Folder names cannot start with a dot.";
  if (name.includes("/") || name.includes("\\")) return "Folder names cannot contain slashes.";
  if (/[<>:"|?*]/.test(name)) {
    return 'Folder names cannot contain < > : " | ? * characters.';
  }
  return null;
}

/** Join library path segments, dropping the empty ones the root produces. */
export function joinLibraryPath(...segments: (string | undefined | null)[]): string {
  return segments
    .flatMap((segment) => (segment ?? "").split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

/** The full storage prefix for a library path — always ends in a slash. */
export function storagePrefix(userId: string, path: string): string {
  const joined = joinLibraryPath(path);
  return joined ? `${userId}/${joined}/` : `${userId}/`;
}

/** Trail from the library root to `path`, for the breadcrumb. */
export function breadcrumbsFor(path: string): { label: string; path: string }[] {
  const segments = joinLibraryPath(path).split("/").filter(Boolean);
  const trail = [{ label: "All media", path: "" }];
  segments.forEach((segment, index) => {
    const upto = segments.slice(0, index + 1).join("/");
    // Only a top-level folder gets a friendly name; "Module 1" inside
    // "recordings" is still "Module 1".
    trail.push({ label: index === 0 ? folderLabel(segment) : segment, path: upto });
  });
  return trail;
}

/** The folder part of a storage key, relative to the user's root. */
export function pathOfKey(userId: string, key: string): string {
  const relative = key.startsWith(`${userId}/`) ? key.slice(userId.length + 1) : key;
  const cut = relative.lastIndexOf("/");
  return cut === -1 ? "" : relative.slice(0, cut);
}

/**
 * Turn one level of a raw store listing into folders and files.
 *
 * Kept separate from the request so it can be tested without a network, and
 * because every rule that matters lives here: markers are folders, not files;
 * a key that is only the prefix itself is the folder's own marker object and
 * belongs to nobody.
 */
export function parseListing(
  raw: { items: CloudListItem[]; folders: string[] },
  userId: string,
  path: string,
): MediaListing {
  const prefix = storagePrefix(userId, path);

  const folders: MediaFolder[] = raw.folders
    .map((full) => {
      const relative = full.startsWith(prefix) ? full.slice(prefix.length) : full;
      const name = relative.replace(/\/+$/, "");
      return name ? { path: joinLibraryPath(path, name), name, label: folderLabel(name) } : null;
    })
    .filter((f): f is MediaFolder => f !== null)
    .sort((a, b) => a.label.localeCompare(b.label));

  const files: MediaFile[] = raw.items
    .filter((item) => {
      if (!item.key || item.key.endsWith("/")) return false;
      const name = item.key.split("/").pop() ?? "";
      // The marker is how an empty folder exists at all; it is not a file.
      return name !== FOLDER_MARKER;
    })
    .map((item) => {
      const name = item.key.split("/").pop() ?? item.key;
      return {
        key: item.key,
        name,
        kind: mediaKindOf(name),
        publicUrl: item.publicUrl ?? "",
        path: pathOfKey(userId, item.key),
        size: item.size,
        createdAt: item.lastModified ?? new Date().toISOString(),
      };
    })
    // Newest first: the file you just added is the one you are looking for.
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { folders, files };
}

/** One level of the library: the folders inside `path` and the files directly in it. */
export async function listMediaFolder(userId: string, path: string): Promise<MediaListing> {
  const raw = await listCloudObjects(storagePrefix(userId, path), { delimiter: "/" });
  return parseListing(raw, userId, path);
}

/**
 * Every folder path implied by a set of keys, intermediates included.
 *
 * Derived from the keys rather than from the store's own folder listing
 * because that only reports one level at a time. Marker keys count: a folder
 * the creator made and has not put anything in yet still has to be somewhere
 * they can move a file to.
 */
export function folderPathsFrom(userId: string, keys: string[]): string[] {
  const paths = new Set<string>();
  for (const key of keys) {
    const path = pathOfKey(userId, key);
    if (!path) continue;
    const segments = path.split("/");
    for (let depth = 1; depth <= segments.length; depth++) {
      paths.add(segments.slice(0, depth).join("/"));
    }
  }
  return [...paths].sort((a, b) => a.localeCompare(b));
}

/**
 * Everything the creator has, anywhere. Used for search — restricting results
 * to the folder you happen to be standing in would be useless — and to fill
 * the "move to" list with every folder that exists.
 */
export async function listEverything(
  userId: string,
): Promise<{ files: MediaFile[]; folderPaths: string[] }> {
  const raw = await listCloudObjects(storagePrefix(userId, ""));
  return {
    files: parseListing({ items: raw.items, folders: [] }, userId, "").files,
    folderPaths: folderPathsFrom(userId, raw.items.map((item) => item.key)),
  };
}

/**
 * Delete a folder the creator made, but only while it is empty.
 *
 * Removing a full folder means removing every object under it, and a stray
 * click doing that to a prefix holding forty lessons is not a mistake anyone
 * recovers from — the store has no undo. So a folder with anything in it says
 * what is in it and refuses.
 */
export async function deleteMediaFolder(userId: string, path: string): Promise<void> {
  const prefix = storagePrefix(userId, path);
  const { items } = await listCloudObjects(prefix);
  const contents = items.filter((item) => (item.key.split("/").pop() ?? "") !== FOLDER_MARKER);

  if (contents.length > 0) {
    throw new Error(
      `“${folderLabel(path)}” still holds ${contents.length} file${contents.length === 1 ? "" : "s"}. Move or delete them first.`,
    );
  }

  await Promise.all(items.map((item) => deleteFromCloud(item.key)));
}

export async function createMediaFolder(
  userId: string,
  parentPath: string,
  name: string,
): Promise<string> {
  const error = folderNameError(name);
  if (error) throw new Error(error);
  const path = joinLibraryPath(parentPath, name.trim());
  await createCloudFolder(`${userId}/${path}`);
  return path;
}

/** Move a file into another folder, keeping its name. */
export async function moveMediaFile(
  userId: string,
  file: MediaFile,
  targetPath: string,
): Promise<string> {
  const destination = `${storagePrefix(userId, targetPath)}${file.name}`;
  if (destination === file.key) return file.key;
  const { path } = await moveCloudObject(file.key, destination);
  return path;
}

/** Bytes as something a human reads: "742 KB", "1.4 GB". */
export function formatFileSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
