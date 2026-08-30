import { describe, it, expect } from "vitest";
import {
  captureErrorMessage,
  describeSizePerMinute,
  fitWithin,
  needsDownscale,
  QUALITY_PROFILES,
  videoBitrateFor,
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

describe("videoBitrateFor", () => {
  const balanced = QUALITY_PROFILES.balanced;

  it("scales with the pixels actually being encoded", () => {
    // The old recorder set no bitrate at all, so Chrome used a flat 2.5 Mbps
    // whether the capture was a 4K monitor or an 800x600 window.
    const at1080p = videoBitrateFor(balanced, "screen", 1920, 1080, 15);
    const at720p = videoBitrateFor(balanced, "screen", 1280, 720, 15);
    expect(at1080p).toBeGreaterThan(at720p);
    expect(at1080p / at720p).toBeCloseTo(2.25, 1);
  });

  it("keeps a 1080p screen recording well under the old flat default", () => {
    // 2.5 Mbps was the old effective rate; balanced has to beat it on size
    // while spending those bits on a quarter as many pixels.
    expect(videoBitrateFor(balanced, "screen", 1920, 1080, 15)).toBeLessThan(2_500_000);
  });

  it("gives camera footage more per pixel than screen content", () => {
    // Slides hold still and compress; a face does not.
    const screen = videoBitrateFor(balanced, "screen", 1280, 720, 30);
    const camera = videoBitrateFor(balanced, "camera", 1280, 720, 30);
    expect(camera).toBeGreaterThan(screen);
  });

  it("orders the presets by size", () => {
    const size = (preset: keyof typeof QUALITY_PROFILES) => {
      const profile = QUALITY_PROFILES[preset];
      return videoBitrateFor(
        profile,
        "screen",
        profile.screen.maxWidth,
        profile.screen.maxHeight,
        profile.screen.frameRate,
      );
    };
    expect(size("small")).toBeLessThan(size("balanced"));
    expect(size("balanced")).toBeLessThan(size("high"));
  });

  it("never drops below a readable floor on a tiny capture", () => {
    // A shared 320x240 window would otherwise be encoded at ~36 kbps.
    expect(videoBitrateFor(balanced, "screen", 320, 240, 15)).toBeGreaterThanOrEqual(400_000);
  });

  it("caps a huge capture rather than trusting the formula", () => {
    expect(videoBitrateFor(QUALITY_PROFILES.high, "screen", 7680, 4320, 60)).toBeLessThanOrEqual(
      8_000_000,
    );
  });
});

describe("fitWithin and needsDownscale", () => {
  it("scales a 4K capture to 1080p keeping its shape", () => {
    expect(fitWithin(3840, 2160, 1920, 1080)).toEqual({ width: 1920, height: 1080 });
  });

  it("leaves a capture that already fits alone", () => {
    expect(fitWithin(1280, 720, 1920, 1080)).toEqual({ width: 1280, height: 720 });
    expect(needsDownscale(1280, 720, 1920, 1080)).toBe(false);
  });

  it("returns even dimensions, which is what encoders want", () => {
    const { width, height } = fitWithin(1023, 767, 800, 800);
    expect(width % 2).toBe(0);
    expect(height % 2).toBe(0);
  });

  it("flags an ultrawide that is only too wide", () => {
    expect(needsDownscale(3440, 1440, 1920, 1080)).toBe(true);
  });
});

describe("describeSizePerMinute", () => {
  it("reports the number a creator actually compares presets on", () => {
    // 1.5 Mbps video + 64 kbps audio is ~11 MB a minute.
    expect(describeSizePerMinute(1_500_000, 64_000)).toBe("about 11 MB per minute");
  });

  it("keeps one decimal while the number is small", () => {
    expect(describeSizePerMinute(400_000, 48_000)).toMatch(/about 3\.2 MB/);
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
