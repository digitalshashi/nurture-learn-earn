/**
 * Which video files a browser can actually play.
 *
 * The app has no transcoding step: whatever is uploaded is served back
 * untouched and handed to a <video> element. So a format the browser cannot
 * decode is not "a file to convert later" — it is a lesson that will never
 * play. The upload pickers used to accept .avi and .mkv, which no browser
 * decodes, and the player's own native-extension list never included them
 * either, so those uploads succeeded and then failed silently at playback.
 *
 * Better to refuse the file in the picker, before someone waits out a 2GB
 * upload, and say what to convert it to.
 */

/** Containers a browser will attempt. Codec support inside them still varies. */
export const PLAYABLE_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv", ".ogg"];

/** What the file dialog offers. */
export const PLAYABLE_VIDEO_ACCEPT = PLAYABLE_VIDEO_EXTENSIONS.join(",");

/**
 * Containers no mainstream browser can play, listed so the message can name
 * the format instead of saying "unsupported file".
 */
const UNPLAYABLE: Record<string, string> = {
  ".avi": "AVI",
  ".mkv": "MKV (Matroska)",
  ".wmv": "WMV",
  ".flv": "FLV",
  ".mpg": "MPEG",
  ".mpeg": "MPEG",
  ".ts": "MPEG-TS",
  ".3gp": "3GP",
  ".rmvb": "RealMedia",
  ".vob": "VOB",
};

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

/**
 * A sentence explaining why this file cannot be used, or null when it can.
 * Written to be shown to a creator, not logged.
 */
export function unplayableVideoReason(fileName: string): string | null {
  const ext = extensionOf(fileName);
  if (!ext) return null;

  const label = UNPLAYABLE[ext];
  if (label) {
    return `${label} files cannot be played in a browser. Convert it to MP4 (H.264 video, AAC audio) and upload that instead.`;
  }

  if (!PLAYABLE_VIDEO_EXTENSIONS.includes(ext)) {
    return `${ext} is not a video format browsers can play. Upload an MP4 (H.264 video, AAC audio).`;
  }

  return null;
}

/** Message for a file that reached the player and failed to decode there. */
export function decodeFailureHint(videoUrl: string | null | undefined): string {
  const ext = extensionOf(videoUrl?.split("?")[0] ?? "");
  if (ext === ".mov") {
    return "This .mov could not be decoded — MOV files often hold ProRes or HEVC, which browsers do not play. Re-export it as MP4 (H.264).";
  }
  return "This video's format or codec is not supported by your browser. MP4 with H.264 video and AAC audio plays everywhere.";
}
