/**
 * Client helper for Cloudflare R2 / AWS S3 uploads via the cloud-storage edge function.
 * All media (videos, thumbnails, recordings, resources) goes to the configured bucket (1corehub).
 */
import { supabase } from "@/integrations/supabase/client";
import { convertImageToWebp, webpPath, WEBP_TYPE } from "@/lib/imageEncoding";

export type CloudFolder =
  | "videos"
  | "thumbnails"
  | "recordings"
  | "resources"
  | "cloud"
  | "branding"
  | "content"
  | "badges"
  | "channels"
  | "landing"
  | "covers";

export interface UploadResult {
  publicUrl: string;
  path: string;
  bucket: string;
  provider: string;
}

export interface CloudListItem {
  key: string;
  size: number;
  lastModified: string | null;
  publicUrl: string | null;
}

export interface CloudListing {
  items: CloudListItem[];
  /** Sub-folder prefixes, returned only when a delimiter was asked for. */
  folders: string[];
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

async function invokeCloudStorage<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("cloud-storage", { body });
  if (error) {
    // functions.invoke wraps non-2xx as FunctionsHttpError; try to surface JSON body
    let message = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        if (j?.error) message = j.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(message || "Storage request failed");
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Build a namespaced object key under the current user. */
export function buildStoragePath(
  userId: string,
  folder: CloudFolder | string,
  fileName: string,
) {
  const safe = sanitizeFileName(fileName || "file");
  return `${userId}/${folder}/${Date.now()}-${safe}`;
}

/**
 * Upload a File/Blob to R2/S3 using a presigned PUT URL.
 * Progress is reported 0–100 when onProgress is provided.
 *
 * Images are re-encoded to WebP on the way through, and the object key's
 * extension is rewritten to match. This is the single door into the bucket, so
 * doing it here means no call site can forget to — and none of them has to
 * know about it. SVGs, animated GIFs and non-images pass through untouched;
 * see src/lib/imageEncoding.ts for why.
 */
export async function uploadToCloud(
  file: File | Blob,
  path: string,
  options?: {
    contentType?: string;
    onProgress?: (percent: number) => void;
    /** Escape hatch for a caller that must store the exact bytes it was given. */
    keepOriginalFormat?: boolean;
  },
): Promise<UploadResult> {
  const encoded = options?.keepOriginalFormat
    ? { file, converted: false }
    : await convertImageToWebp(file);

  const body = encoded.file;
  const uploadPath = encoded.converted ? webpPath(path) : path;

  // A caller's declared contentType describes what it handed us, so it stops
  // being true the moment we re-encode.
  const contentType = encoded.converted
    ? WEBP_TYPE
    : options?.contentType || (file as File).type || "application/octet-stream";

  options?.onProgress?.(5);

  const presign = await invokeCloudStorage<{
    uploadUrl: string;
    publicUrl: string;
    path: string;
    bucket: string;
    provider: string;
    headers?: Record<string, string>;
  }>({
    action: "presign",
    path: uploadPath,
    contentType,
  });

  options?.onProgress?.(15);

  await putWithProgress(presign.uploadUrl, body, contentType, (p) => {
    // Map PUT progress into 15–95
    options?.onProgress?.(15 + Math.round(p * 0.8));
  });

  options?.onProgress?.(100);

  return {
    publicUrl: presign.publicUrl,
    path: presign.path,
    bucket: presign.bucket,
    provider: presign.provider,
  };
}

/** Convenience: upload under userId/folder/timestamp-filename */
export async function uploadUserFile(
  userId: string,
  folder: CloudFolder | string,
  file: File | Blob,
  options?: {
    fileName?: string;
    contentType?: string;
    onProgress?: (percent: number) => void;
  },
): Promise<UploadResult> {
  const name =
    options?.fileName ||
    (file as File).name ||
    `upload-${Date.now()}`;
  const path = buildStoragePath(userId, folder, name);
  return uploadToCloud(file, path, {
    contentType: options?.contentType || (file as File).type,
    onProgress: options?.onProgress,
  });
}

export async function deleteFromCloud(pathOrUrl: string): Promise<void> {
  const isUrl = /^https?:\/\//i.test(pathOrUrl);
  await invokeCloudStorage({
    action: "delete",
    ...(isUrl ? { url: pathOrUrl } : { path: pathOrUrl }),
  });
}

interface RawListing {
  items: CloudListItem[];
  folders?: string[];
  cursor?: string | null;
}

/**
 * Walk a prefix to the end rather than stopping at the store's page size.
 *
 * A single ListObjectsV2 returns at most 1000 keys. A creator with more media
 * than that used to see only the first page, with no indication the rest
 * existed — so uploads simply disappeared from the library.
 *
 * `delimiter: "/"` makes the store report each immediate sub-folder once
 * instead of every object beneath it, which is what the folder view needs.
 * Omitting it walks the whole subtree, which is what search needs.
 */
export async function listCloudObjects(
  prefix: string,
  options?: { delimiter?: string; maxPages?: number },
): Promise<CloudListing> {
  const items: CloudListItem[] = [];
  const folders: string[] = [];
  let cursor: string | null | undefined;
  // 20 pages is 20,000 objects — far past any real library, and a hard stop so
  // a store that keeps handing back a cursor cannot spin here forever.
  const maxPages = options?.maxPages ?? 20;

  for (let page = 0; page < maxPages; page++) {
    const data: RawListing = await invokeCloudStorage<RawListing>({
      action: "list",
      prefix,
      maxKeys: 1000,
      delimiter: options?.delimiter,
      cursor: cursor || undefined,
    });

    items.push(...(data.items || []));
    for (const folder of data.folders || []) {
      if (!folders.includes(folder)) folders.push(folder);
    }

    cursor = data.cursor;
    if (!cursor) break;
  }

  return { items, folders };
}

export async function listCloudFiles(
  prefix: string,
  maxKeys = 100,
): Promise<CloudListItem[]> {
  const data = await invokeCloudStorage<{ items: CloudListItem[] }>({
    action: "list",
    prefix,
    maxKeys,
  });
  return data.items || [];
}

/** Create an empty folder by writing its marker object. */
export async function createCloudFolder(path: string): Promise<{ prefix: string }> {
  return invokeCloudStorage<{ prefix: string }>({ action: "folder", path });
}

/** Server-side copy, then delete — the object never travels via the browser. */
export async function moveCloudObject(
  from: string,
  to: string,
): Promise<{ path: string; publicUrl: string }> {
  return invokeCloudStorage<{ path: string; publicUrl: string }>({
    action: "move",
    from,
    to,
  });
}

export async function getCloudConfig(): Promise<{
  provider: string;
  bucket: string;
  publicUrl: string;
  configured: boolean;
}> {
  return invokeCloudStorage({ action: "config" });
}

function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(
            `Upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 200) || xhr.statusText}`,
          ),
        );
      }
    };

    // A PUT the browser refuses, or one that never completes, reaches onerror
    // with no status and no body — there is nothing to report but the fact of
    // it. The bucket policy allows any origin (see
    // scripts/apply-storage-cors.md), so this is far more often a connection
    // that dropped than a policy that rejected.
    xhr.onerror = () =>
      reject(
        new Error(
          "The upload could not reach storage. Check your connection and try again — " +
            "if it keeps happening, the storage bucket may need its CORS rules applied " +
            '("npm run storage:cors").',
        ),
      );
    xhr.ontimeout = () => reject(new Error("The upload timed out before it finished."));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    xhr.send(body);
  });
}
