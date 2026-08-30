/**
 * Reading a video file's own metadata in the browser, before it is uploaded.
 *
 * This is what fills `chapters.duration_seconds`. Nothing wrote that column
 * before, which is why lecture rows had no duration to show — the player and
 * the course overview both read it and found null. The browser already has to
 * decode the file's header to play it, so asking for the duration costs one
 * blob URL and no server work at all.
 */

export interface VideoProbe {
  /** Whole seconds, or null when the file has no readable duration. */
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}

const EMPTY: VideoProbe = { durationSeconds: null, width: null, height: null };

/** How long to wait for metadata before giving up and uploading anyway. */
const PROBE_TIMEOUT_MS = 8_000;

export function isProbableVideo(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(file.name);
}

/**
 * Never rejects: a file we cannot read metadata from is still a file worth
 * uploading, so a failed probe degrades to "unknown duration".
 */
export function probeVideo(file: File): Promise<VideoProbe> {
  if (!isProbableVideo(file)) return Promise.resolve(EMPTY);
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return Promise.resolve(EMPTY);
  }

  return new Promise<VideoProbe>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const finish = (result: VideoProbe) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(result);
    };

    const timer = setTimeout(() => finish(EMPTY), PROBE_TIMEOUT_MS);

    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      // Some containers report Infinity until a seek; treat that as unknown
      // rather than writing a nonsense duration.
      const raw = video.duration;
      const duration = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
      finish({
        durationSeconds: duration,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      });
    };
    video.onerror = () => finish(EMPTY);
    video.src = url;
  });
}
