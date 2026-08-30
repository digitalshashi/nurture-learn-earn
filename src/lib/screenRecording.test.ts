import { describe, it, expect } from "vitest";
import {
  captureErrorMessage,
  formatDuration,
  pickRecordingFormat,
  recorderUnavailableReason,
  recordingFileName,
} from "./screenRecording";

const able = {
  hasMediaDevices: true,
  hasDisplayCapture: true,
  hasRecorder: true,
  isSecureContext: true,
};

describe("pickRecordingFormat", () => {
  it("prefers WebM/VP9 where the browser records it", () => {
    const format = pickRecordingFormat(() => true);
    expect(format).toMatchObject({ extension: ".webm", contentType: "video/webm" });
    expect(format?.mimeType).toMatch(/vp9/);
  });

  it("falls back to MP4 on Safari, which records nothing else", () => {
    // The old recorder asked for "video/webm" unconditionally, so the
    // MediaRecorder constructor threw before Safari recorded a single frame.
    const format = pickRecordingFormat((type) => type.startsWith("video/mp4"));
    expect(format).toMatchObject({ extension: ".mp4", contentType: "video/mp4" });
  });

  it("reports no format rather than picking one that will throw", () => {
    expect(pickRecordingFormat(() => false)).toBeNull();
  });
});

describe("recorderUnavailableReason", () => {
  it("passes a browser that can record", () => {
    expect(recorderUnavailableReason(able)).toBeNull();
  });

  it("blames the URL, not the browser, outside a secure context", () => {
    // navigator.mediaDevices is simply absent over plain http, so checking the
    // API first would report "this browser cannot record" on Chrome.
    const reason = recorderUnavailableReason({
      ...able,
      isSecureContext: false,
      hasMediaDevices: false,
      hasDisplayCapture: false,
    });
    expect(reason).toMatch(/HTTPS/);
  });

  it("still allows a camera recording where screen capture is impossible", () => {
    const iPad = { ...able, hasDisplayCapture: false };
    expect(recorderUnavailableReason(iPad, true)).toMatch(/screen/i);
    expect(recorderUnavailableReason(iPad, false)).toBeNull();
  });
});

describe("captureErrorMessage", () => {
  it("names the Permissions-Policy header when the page was never allowed to ask", () => {
    // This is the failure that made every recording fail in production, and
    // the old message told the creator to check browser permissions — which
    // could not have fixed it.
    const error = Object.assign(
      new Error("Permissions policy violation: microphone is not allowed in this document."),
      { name: "NotAllowedError" },
    );
    const message = captureErrorMessage(error, "microphone");
    expect(message).toMatch(/Permissions-Policy/);
    expect(message).not.toMatch(/padlock/);
  });

  it("tells a user who dismissed the prompt how to grant it", () => {
    const error = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });
    expect(captureErrorMessage(error, "camera")).toMatch(/padlock/);
  });

  it("treats a cancelled screen share as a cancellation, not a failure", () => {
    const error = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });
    expect(captureErrorMessage(error, "screen")).toMatch(/cancelled/i);
  });

  it("says a device is busy when another app holds it", () => {
    const error = Object.assign(new Error("Could not start video source"), {
      name: "NotReadableError",
    });
    expect(captureErrorMessage(error, "camera")).toMatch(/already in use/i);
  });

  it("says a device is missing when there is none", () => {
    const error = Object.assign(new Error("Requested device not found"), {
      name: "NotFoundError",
    });
    expect(captureErrorMessage(error, "microphone")).toMatch(/No microphone/);
  });

  it("falls back to the browser's own words rather than an empty string", () => {
    expect(captureErrorMessage(new Error("Something odd"), "screen")).toBe("Something odd");
  });
});

describe("formatDuration", () => {
  it("always shows hours so a long recording never re-flows the layout", () => {
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(65)).toBe("00:01:05");
    expect(formatDuration(3661)).toBe("01:01:01");
  });
});

describe("recordingFileName", () => {
  it("sorts by name and carries the container's extension", () => {
    const name = recordingFileName(".mp4", new Date(2026, 1, 3, 9, 5, 7));
    expect(name).toBe("recording-2026-02-03-090507.mp4");
  });
});
