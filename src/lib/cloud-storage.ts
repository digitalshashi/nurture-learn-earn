/**
 * Client helper for Cloudflare R2 / AWS S3 uploads via the cloud-storage edge function.
 * All media (videos, thumbnails, recordings, resources) goes to the configured bucket (1corehub).
 */
import { supabase } from "@/integrations/supabase/client";

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
 */
export async function uploadToCloud(
  file: File | Blob,
  path: string,
  options?: {
    contentType?: string;
    onProgress?: (percent: number) => void;
  },
): Promise<UploadResult> {
  const contentType =
    options?.contentType ||
    (file as File).type ||
    "application/octet-stream";

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
    path,
    contentType,
  });

  options?.onProgress?.(15);

  await putWithProgress(presign.uploadUrl, file, contentType, (p) => {
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

    xhr.onerror = () =>
      reject(
        new Error(
          "Network error during upload. Ensure R2/S3 CORS allows PUT from this origin.",
        ),
      );
    xhr.onabort = () => reject(new Error("Upload aborted"));

    xhr.send(body);
  });
}
