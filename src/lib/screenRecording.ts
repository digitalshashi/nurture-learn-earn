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
