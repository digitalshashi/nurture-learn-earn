/**
 * The parts of in-browser recording that are decisions rather than plumbing.
 *
 * Recording used to fail with a bare "Recording failed — could not access
 * screen/camera/mic. Check browser permissions", which was wrong in the most
 * common case and unhelpful in all of them. The site's own
 * `Permissions-Policy` header denied camera and microphone outright (see
 * public/_headers), so the browser refused before it ever prompted — no amount
 * of checking browser permissions would have fixed it, and nothing said so.
 *
 * Everything here is pure so the rules can be tested without a camera.
 */

export interface RecordingFormat {
  /** What MediaRecorder is constructed with. */
  mimeType: string;
  /** File extension matching that container, including the dot. */
  extension: string;
  /** Content type to store the object under — no codecs parameter. */
  contentType: string;
}

/**
 * Containers in the order we would rather have them.
 *
 * WebM/VP9 is the best quality-per-byte and what Chrome, Edge and Firefox all
 * record natively. MP4 is last but not optional: Safari records *only* MP4, and
 * the old code asked for `video/webm` unconditionally, so on Safari and every
 * iPad the MediaRecorder constructor threw NotSupportedError before recording
 * began.
 */
const CANDIDATES: RecordingFormat[] = [
  { mimeType: "video/webm;codecs=vp9,opus", extension: ".webm", contentType: "video/webm" },
  { mimeType: "video/webm;codecs=vp8,opus", extension: ".webm", contentType: "video/webm" },
  { mimeType: "video/webm", extension: ".webm", contentType: "video/webm" },
  { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: ".mp4", contentType: "video/mp4" },
  { mimeType: "video/mp4", extension: ".mp4", contentType: "video/mp4" },
];

/**
 * The best container this browser will actually record, or null if it records
 * none of them.
 *
 * `isTypeSupported` is missing on a few older WebViews; there, the browser
 * default is the only option, which MediaRecorder picks when given none.
 */
export function pickRecordingFormat(
  isSupported?: (type: string) => boolean,
): RecordingFormat | null {
  const test =
    isSupported ??
    (typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function"
      ? (type: string) => MediaRecorder.isTypeSupported(type)
      : null);

  if (!test) {
    return { mimeType: "", extension: ".webm", contentType: "video/webm" };
  }

  return CANDIDATES.find((candidate) => test(candidate.mimeType)) ?? null;
}

export interface RecorderEnvironment {
  hasMediaDevices: boolean;
  hasDisplayCapture: boolean;
  hasRecorder: boolean;
  isSecureContext: boolean;
}

/** Read the current browser's capabilities. Split out so tests can fake them. */
export function readRecorderEnvironment(): RecorderEnvironment {
  const devices = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  return {
    hasMediaDevices: typeof devices?.getUserMedia === "function",
    hasDisplayCapture: typeof devices?.getDisplayMedia === "function",
    hasRecorder: typeof MediaRecorder !== "undefined",
    isSecureContext: typeof window === "undefined" ? true : window.isSecureContext !== false,
  };
}

/**
 * Why this browser cannot record at all, or null when it can.
 *
 * Checked before the UI offers a Record button, so a browser that was never
 * going to work says so up front instead of after the creator has chosen a
 * mode and clicked start.
 */
export function recorderUnavailableReason(
  environment: RecorderEnvironment,
  wantsScreen = true,
): string | null {
  // `navigator.mediaDevices` is simply absent outside a secure context, so this
  // has to be checked first or the message blames the browser for the URL.
  if (!environment.isSecureContext) {
    return "Recording needs a secure connection. Open this page over HTTPS (or on localhost) and try again.";
  }
  if (!environment.hasRecorder || !environment.hasMediaDevices) {
    return "This browser cannot record video. Chrome, Edge, Firefox and Safari 15+ all can.";
  }
  if (wantsScreen && !environment.hasDisplayCapture) {
    return "This browser cannot capture a screen — on iPhone and iPad no browser can. Record with the camera instead, or upload a file.";
  }
  return null;
}

/** What the creator was reaching for when it failed, for the message. */
export type CaptureTarget = "screen" | "camera" | "microphone";

const TARGET_LABEL: Record<CaptureTarget, string> = {
  screen: "screen",
  camera: "camera",
  microphone: "microphone",
};

/**
 * A sentence a creator can act on, from whatever the browser threw.
 *
 * The distinction that matters is between a permission the *user* declined —
 * which they can grant on the next try — and one the *page* is not allowed to
 * ask for, which is a `Permissions-Policy` header and no amount of clicking
 * will change it. Both arrive as NotAllowedError; only the message tells them
 * apart, so it is worth reading.
 */
export function captureErrorMessage(error: unknown, target: CaptureTarget): string {
  const label = TARGET_LABEL[target];
  const name = (error as { name?: string })?.name ?? "";
  const detail = String((error as { message?: string })?.message ?? "");
  const blockedByPolicy = /permissions?\s*policy|disallowed|feature policy/i.test(detail);

  if (name === "NotAllowedError" || name === "SecurityError") {
    if (blockedByPolicy) {
      return `This site is not allowed to use the ${label}. Its Permissions-Policy header blocks it, so the browser refuses before asking you — a deploy of the current build fixes it.`;
    }
    return target === "screen"
      ? "Screen sharing was cancelled. Click Start recording and choose a screen, window or tab to share."
      : `Access to the ${label} was blocked. Click the padlock in the address bar, allow the ${label} for this site, then try again.`;
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return `No ${label} was found on this device. Plug one in, or turn it off in the recording options.`;
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return `The ${label} is already in use by another app. Close Zoom, Meet or any other call and try again.`;
  }

  if (name === "OverconstrainedError") {
    return `Your ${label} does not support the requested quality. Try again at a lower resolution.`;
  }

  if (name === "AbortError") {
    return `The ${label} stopped unexpectedly. Try again.`;
  }

  if (name === "TypeError" || /undefined/.test(detail)) {
    return "This browser does not expose recording APIs on this page. Open the site over HTTPS in Chrome, Edge, Firefox or Safari.";
  }

  return detail || `Could not start the ${label}.`;
}

/**
 * How large a recording comes out, and how good it looks.
 *
 * MediaRecorder was previously given no encoding options at all, which is the
 * worst of both worlds: Chrome falls back to a flat 2.5 Mbps *whatever the
 * resolution*, and a screen share is captured at the monitor's native size. On
 * a 4K display that spends 2.5 Mbps on 8.3 million pixels — roughly 19 MB a
 * minute for a picture in which small text is visibly mushy, because there are
 * nowhere near enough bits to go round.
 *
 * Three knobs fix that, in order of how much they matter:
 *
 *   Resolution — 1080p is the most any lesson needs. Capping it means the same
 *                bits cover a quarter as many pixels, so each one is sharper.
 *   Frame rate — slides and code do not move. 15fps halves the data for
 *                content that looks identical either way; the camera, which
 *                does move, keeps 30.
 *   Bitrate    — set from the pixels actually being encoded rather than left
 *                at a constant that fits no resolution in particular.
 */
export type QualityPreset = "small" | "balanced" | "high";

export interface QualityProfile {
  key: QualityPreset;
  label: string;
  description: string;
  screen: { maxWidth: number; maxHeight: number; frameRate: number; bitsPerPixel: number };
  camera: { maxWidth: number; maxHeight: number; frameRate: number; bitsPerPixel: number };
  audioBitsPerSecond: number;
}

/**
 * `bitsPerPixel` is bits per pixel per frame — the one number that decides
 * quality per byte. Screen content compresses far better than camera footage
 * (large flat areas, unchanged between frames), so it is given less and still
 * looks better.
 */
export const QUALITY_PROFILES: Record<QualityPreset, QualityProfile> = {
  small: {
    key: "small",
    label: "Smallest file",
    description: "720p · for slides and long recordings",
    screen: { maxWidth: 1280, maxHeight: 720, frameRate: 10, bitsPerPixel: 0.075 },
    camera: { maxWidth: 854, maxHeight: 480, frameRate: 24, bitsPerPixel: 0.08 },
    audioBitsPerSecond: 48_000,
  },
  balanced: {
    key: "balanced",
    label: "Balanced",
    description: "1080p · sharp text, modest size",
    screen: { maxWidth: 1920, maxHeight: 1080, frameRate: 15, bitsPerPixel: 0.05 },
    camera: { maxWidth: 1280, maxHeight: 720, frameRate: 30, bitsPerPixel: 0.06 },
    audioBitsPerSecond: 64_000,
  },
  high: {
    key: "high",
    label: "Highest quality",
    description: "1080p 30fps · for demos and motion",
    screen: { maxWidth: 1920, maxHeight: 1080, frameRate: 30, bitsPerPixel: 0.055 },
    camera: { maxWidth: 1920, maxHeight: 1080, frameRate: 30, bitsPerPixel: 0.05 },
    audioBitsPerSecond: 96_000,
  },
};

export const DEFAULT_QUALITY: QualityPreset = "balanced";

/** Below this a lesson stops being readable; above it nothing looks better. */
const MIN_VIDEO_BITRATE = 400_000;
const MAX_VIDEO_BITRATE = 8_000_000;

/**
 * The bitrate to encode at, from the frame size actually being captured.
 *
 * Taking the real `getSettings()` size matters: a creator who shares a single
 * 800×600 window should not be handed a bitrate chosen for a 4K monitor, and
 * one who shares a 4K monitor should not be handed 2.5 Mbps.
 */
export function videoBitrateFor(
  profile: QualityProfile,
  content: "screen" | "camera",
  width: number,
  height: number,
  frameRate?: number,
): number {
  const settings = profile[content];
  const pixels = Math.max(1, width * height);
  const fps = frameRate && frameRate > 0 ? frameRate : settings.frameRate;
  const raw = pixels * fps * settings.bitsPerPixel;
  return Math.round(Math.min(MAX_VIDEO_BITRATE, Math.max(MIN_VIDEO_BITRATE, raw)));
}

/** Scale a capture down to fit inside a profile's cap, keeping its shape. */
export function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  // Encoders want even dimensions; an odd width costs a re-crop at best.
  const even = (value: number) => Math.max(2, Math.round((value * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

/** Whether a capture is already small enough to record without rescaling it. */
export function needsDownscale(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): boolean {
  return width > maxWidth || height > maxHeight;
}

/**
 * Roughly how big a minute of this will be, so the choice is made on the
 * number the creator actually cares about rather than on the word "balanced".
 */
export function megabytesPerMinute(videoBitsPerSecond: number, audioBitsPerSecond: number): number {
  const bytesPerMinute = ((videoBitsPerSecond + audioBitsPerSecond) / 8) * 60;
  return bytesPerMinute / (1024 * 1024);
}

/** "about 12 MB per minute" — deliberately vague; the true size depends on motion. */
export function describeSizePerMinute(
  videoBitsPerSecond: number,
  audioBitsPerSecond: number,
): string {
  const mb = megabytesPerMinute(videoBitsPerSecond, audioBitsPerSecond);
  const rounded = mb < 10 ? Math.round(mb * 10) / 10 : Math.round(mb);
  return `about ${rounded} MB per minute`;
}

/** "01:23:45" — always hours, so a long recording never re-flows the layout. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

/** File name for a finished recording: sortable, and unique per second. */
export function recordingFileName(extension: string, now = new Date()): string {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  return `recording-${stamp}-${time}${extension}`;
}
