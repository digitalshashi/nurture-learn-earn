// How a chapter's video should be played.
//
//   native — <video> with our own controls (mp4/webm/mov/ogg, and anything
//            served from our own storage)
//   hls    — <video> driven by hls.js, which also exposes real quality levels
//   youtube / vimeo — third-party iframe, driven through that vendor's JS API
//                     so our control bar still works
//   embed  — iframe we cannot drive (Loom, Google Drive, unknown providers)
export type VideoKind = "native" | "hls" | "youtube" | "vimeo" | "embed" | "none";

export interface ResolvedSource {
  kind: VideoKind;
  /** For native/hls: the media URL. For youtube/vimeo: the video id. For embed: the iframe src. */
  src: string;
}

const NATIVE_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv", ".ogg"];

function stripQuery(url: string): string {
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  const cut = Math.min(q === -1 ? url.length : q, h === -1 ? url.length : h);
  return url.slice(0, cut);
}

export function youtubeId(url: string): string | null {
  // youtu.be/ID, /watch?v=ID, /embed/ID, /shorts/ID, /live/ID
  const patterns = [
    /youtu\.be\/([\w-]{6,})/,
    /[?&]v=([\w-]{6,})/,
    /\/embed\/([\w-]{6,})/,
    /\/shorts\/([\w-]{6,})/,
    /\/live\/([\w-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function vimeoId(url: string): string | null {
  // vimeo.com/123456789, player.vimeo.com/video/123456789, /channels/x/123456789
  const m = url.match(/vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d{6,})/);
  return m ? m[1] : null;
}

function driveEmbed(url: string): string | null {
  const id = url.match(/\/d\/([^/]+)/)?.[1] || url.match(/[?&]id=([^&]+)/)?.[1];
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

/**
 * Decide how to play a chapter's video.
 *
 * The previous logic treated anything without video_type === "upload" or a
 * "course-videos" path as third-party and dropped it into a bare <iframe>.
 * Uploads through the curriculum flow save video_type "direct" and live on R2,
 * so they matched neither test — the iframe then handed the MP4 to the
 * browser's built-in viewer instead of our player. Detection is now driven by
 * the URL itself, with video_type as a hint rather than the sole authority.
 */
export function resolveSource(
  videoUrl: string | null | undefined,
  videoType?: string | null,
): ResolvedSource {
  if (!videoUrl || !videoUrl.trim()) return { kind: "none", src: "" };

  const url = videoUrl.trim();
  const type = (videoType || "").toLowerCase();
  const path = stripQuery(url).toLowerCase();

  const yt = youtubeId(url);
  if (type === "youtube" || (yt && /(?:youtube\.com|youtu\.be)/i.test(url))) {
    if (yt) return { kind: "youtube", src: yt };
  }

  const vim = vimeoId(url);
  if (type === "vimeo" || (vim && /vimeo\.com/i.test(url))) {
    if (vim) return { kind: "vimeo", src: vim };
  }

  if (/\.m3u8$/.test(path) || type === "hls") return { kind: "hls", src: url };
  if (/\.mpd$/.test(path)) return { kind: "embed", src: url }; // DASH unsupported; don't pretend

  if (/loom\.com/i.test(url)) {
    return { kind: "embed", src: url.replace("/share/", "/embed/") };
  }

  if (/drive\.google\.com/i.test(url)) {
    const embed = driveEmbed(url);
    if (embed) return { kind: "embed", src: embed };
  }

  if (NATIVE_EXTENSIONS.some((ext) => path.endsWith(ext))) {
    return { kind: "native", src: url };
  }

  // Our own uploads are served from object storage without a guaranteed
  // extension, so trust the explicit type over the URL. "library" is the same
  // storage reached a different way — a file picked from the video library
  // rather than uploaded into this chapter.
  if (type === "upload" || type === "direct" || type === "library") {
    return { kind: "native", src: url };
  }

  return { kind: "embed", src: url };
}
