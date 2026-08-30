import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VideoPlayer } from "./VideoPlayer";
import { formatTime } from "./formatTime";

const MP4 = "https://cdn.example.com/lesson.mp4";

// jsdom implements no media pipeline, so stand in for the bits the player drives.
let currentTime = 0;
let playbackRate = 1;
let volume = 1;
let muted = false;

function stubMedia() {
  currentTime = 0;
  playbackRate = 1;
  volume = 1;
  muted = false;

  const proto = window.HTMLMediaElement.prototype;
  vi.spyOn(proto, "play").mockImplementation(function (this: HTMLVideoElement) {
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(proto, "pause").mockImplementation(function (this: HTMLVideoElement) {
    this.dispatchEvent(new Event("pause"));
  });
  vi.spyOn(proto, "canPlayType").mockReturnValue("");

  Object.defineProperty(proto, "duration", { configurable: true, get: () => 600 });
  Object.defineProperty(proto, "buffered", {
    configurable: true,
    get: () => ({ length: 1, start: () => 0, end: () => 120 }),
  });
  // Intrinsic size lives on HTMLVideoElement, not HTMLMediaElement.
  const videoProto = window.HTMLVideoElement.prototype;
  Object.defineProperty(videoProto, "videoWidth", { configurable: true, get: () => 1920 });
  Object.defineProperty(videoProto, "videoHeight", { configurable: true, get: () => 1080 });
  Object.defineProperty(proto, "currentTime", {
    configurable: true,
    get: () => currentTime,
    set: (v) => {
      currentTime = v;
    },
  });
  Object.defineProperty(proto, "playbackRate", {
    configurable: true,
    get: () => playbackRate,
    set: (v) => {
      playbackRate = v;
    },
  });
  Object.defineProperty(proto, "volume", {
    configurable: true,
    get: () => volume,
    set: (v) => {
      volume = v;
    },
  });
  Object.defineProperty(proto, "muted", {
    configurable: true,
    get: () => muted,
    set: (v) => {
      muted = v;
    },
  });
}

function renderPlayer(props = {}) {
  const utils = render(<VideoPlayer videoUrl={MP4} videoType="direct" {...props} />);
  const video = document.querySelector("video") as HTMLVideoElement;
  // Metadata arrives asynchronously in a real browser; fire it by hand.
  act(() => {
    video.dispatchEvent(new Event("loadedmetadata"));
  });
  return { ...utils, video };
}

beforeEach(stubMedia);
afterEach(() => vi.restoreAllMocks());

describe("formatTime", () => {
  it("formats sub-hour and multi-hour durations", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(9)).toBe("0:09");
    expect(formatTime(75)).toBe("1:15");
    expect(formatTime(3661)).toBe("1:01:01");
  });

  it("does not emit NaN for junk input", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
  });
});

describe("VideoPlayer", () => {
  it("renders a <video>, not an iframe, for an uploaded mp4", () => {
    renderPlayer();
    expect(document.querySelector("video")).toBeTruthy();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("uses an iframe for providers it cannot drive", () => {
    render(<VideoPlayer videoUrl="https://www.loom.com/share/abc" />);
    expect(document.querySelector("iframe")).toBeTruthy();
    expect(document.querySelector("video")).toBeNull();
  });

  it("shows no native browser controls", () => {
    const { video } = renderPlayer();
    expect(video.hasAttribute("controls")).toBe(false);
  });

  it("seeks forward and back with the arrow keys", () => {
    renderPlayer();

    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    expect(currentTime).toBe(10);

    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    expect(currentTime).toBe(20);

    act(() => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    });
    expect(currentTime).toBe(10);
  });

  it("jumps 30s with shift+arrow", () => {
    renderPlayer();
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    });
    expect(currentTime).toBe(30);
  });

  it("clamps seeking to the media bounds", () => {
    renderPlayer();
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    });
    expect(currentTime).toBe(0); // never negative

    act(() => {
      for (let i = 0; i < 100; i++) fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    expect(currentTime).toBe(600); // never past duration
  });

  it("toggles play with space and k", () => {
    const { video } = renderPlayer();
    const play = vi.spyOn(video, "play");
    const pause = vi.spyOn(video, "pause");

    act(() => {
      fireEvent.keyDown(window, { key: " " });
    });
    expect(play).toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(window, { key: "k" });
    });
    expect(pause).toHaveBeenCalled();
  });

  it("adjusts volume and mute from the keyboard", () => {
    renderPlayer();
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowDown" });
    });
    expect(volume).toBeCloseTo(0.95);

    act(() => {
      fireEvent.keyDown(window, { key: "ArrowUp" });
    });
    expect(volume).toBeCloseTo(1);

    act(() => {
      fireEvent.keyDown(window, { key: "m" });
    });
    expect(muted).toBe(true);
  });

  it("jumps to a decile with number keys", () => {
    renderPlayer();
    act(() => {
      fireEvent.keyDown(window, { key: "5" });
    });
    expect(currentTime).toBe(300);
  });

  it("ignores keys typed into a form field", () => {
    renderPlayer();
    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      fireEvent.keyDown(input, { key: "ArrowRight" });
    });
    expect(currentTime).toBe(0);

    input.remove();
  });

  it("changes playback speed through the settings menu", () => {
    renderPlayer();

    act(() => {
      fireEvent.click(screen.getByLabelText("Settings"));
    });
    act(() => {
      fireEvent.click(screen.getByText("Playback speed"));
    });
    act(() => {
      fireEvent.click(screen.getByText("1.5x"));
    });

    expect(playbackRate).toBe(1.5);
  });

  it("reports the real resolution rather than fake quality options", () => {
    renderPlayer();

    act(() => {
      fireEvent.click(screen.getByLabelText("Settings"));
    });

    expect(screen.getByText("Source (1920×1080)")).toBeInTheDocument();
  });

  it("marks quality provider-managed for YouTube instead of offering a dead menu", () => {
    render(<VideoPlayer videoUrl="https://youtu.be/dQw4w9WgXcQ" />);

    act(() => {
      fireEvent.click(screen.getByLabelText("Settings"));
    });

    expect(screen.getByText("Auto (provider)")).toBeInTheDocument();
  });

  it("toggles the mini player", () => {
    const { container } = renderPlayer();

    act(() => {
      fireEvent.click(screen.getByLabelText("Mini player"));
    });
    expect(container.querySelector(".fixed")).toBeTruthy();
    expect(screen.getByLabelText("Close mini player")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByLabelText("Close mini player"));
    });
    expect(container.querySelector(".fixed")).toBeNull();
  });

  it("offers pop-out for native media and requests PiP", () => {
    const { video } = renderPlayer();
    const requestPiP = vi.fn().mockResolvedValue(undefined);
    video.requestPictureInPicture = requestPiP;

    act(() => {
      fireEvent.click(screen.getByLabelText("Pop out (i)"));
    });
    expect(requestPiP).toHaveBeenCalled();
  });

  it("hides pop-out for iframe-backed sources that cannot support it", () => {
    render(<VideoPlayer videoUrl="https://youtu.be/dQw4w9WgXcQ" />);
    expect(screen.queryByLabelText("Pop out (i)")).toBeNull();
  });

  it("fires onEnded so the course can advance", () => {
    const onEnded = vi.fn();
    const { video } = renderPlayer({ onEnded });

    act(() => {
      video.dispatchEvent(new Event("ended"));
    });
    expect(onEnded).toHaveBeenCalled();
  });

  it("surfaces a readable message when the media fails", () => {
    const { video } = renderPlayer();

    act(() => {
      video.dispatchEvent(new Event("error"));
    });
    expect(screen.getByText("This video could not be loaded.")).toBeInTheDocument();
  });

  it("renders an empty state when a lesson has no video", () => {
    render(<VideoPlayer videoUrl={null} />);
    expect(screen.getByText("No video for this lesson")).toBeInTheDocument();
  });

  describe("sizing", () => {
    // Defaulting to aspect-video made the player impose its own 16:9 height on a
    // full-width column, overflowing the container's max-height cap and covering
    // the Description/Resources/QnA tabs underneath it.
    const shellOf = (c: HTMLElement) => c.querySelector(".group") as HTMLElement;

    it("sizes itself at 16:9 by default", () => {
      const { container } = renderPlayer();
      expect(shellOf(container).className).toContain("aspect-video");
    });

    it("stretches to the container instead of forcing its own height when fit='fill'", () => {
      const { container } = render(<VideoPlayer videoUrl={MP4} videoType="direct" fit="fill" />);
      const shell = shellOf(container);
      expect(shell.className).toContain("absolute inset-0");
      expect(shell.className).not.toContain("aspect-video");
    });

    it("applies fit to the iframe and empty branches too", () => {
      const { container: embed } = render(
        <VideoPlayer videoUrl="https://www.loom.com/share/abc" fit="fill" />,
      );
      expect((embed.firstElementChild as HTMLElement).className).toContain("absolute inset-0");

      const { container: empty } = render(<VideoPlayer videoUrl={null} fit="fill" />);
      expect((empty.firstElementChild as HTMLElement).className).toContain("absolute inset-0");
    });
  });
});
