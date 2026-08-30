/**
 * The creator's video library.
 *
 * There is no library table: the library *is* what sits in object storage
 * under the user's `videos/` and `recordings/` prefixes. Anything uploaded
 * through the course builder, the lesson recorder or the library page itself
 * lands there and shows up here, so a video only ever has to be uploaded once
 * and can then be attached to as many chapters as you like.
 */
import { listCloudFiles } from "@/lib/cloud-storage";

export type LibraryFolder = "videos" | "recordings";

export interface LibraryVideo {
  /** Storage key — unique, and what deletion takes. */
  id: string;
  key: string;
  name: string;
  folder: LibraryFolder;
  publicUrl: string;
  createdAt: string;
  size: number;
  /** Known only for a video probed at upload time; storage does not keep it. */
  durationSeconds?: number | null;
}

/** Bytes as something a human reads: "742 KB", "1.4 GB". */
export function formatFileSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Newest first — the video you just uploaded is the one you are looking for. */
export async function listLibraryVideos(userId: string): Promise<LibraryVideo[]> {
  const [recordings, uploads] = await Promise.all([
    listCloudFiles(`${userId}/recordings/`),
    listCloudFiles(`${userId}/videos/`),
  ]);

  const map = (items: Awaited<ReturnType<typeof listCloudFiles>>, folder: LibraryFolder) =>
    items
      .filter((f) => f.key && !f.key.endsWith("/"))
      .map<LibraryVideo>((f) => ({
        id: f.key,
        key: f.key,
        name: f.key.split("/").pop() || f.key,
        folder,
        publicUrl: f.publicUrl || "",
        createdAt: f.lastModified || new Date().toISOString(),
        size: f.size,
      }));

  return [...map(recordings, "recordings"), ...map(uploads, "videos")].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
