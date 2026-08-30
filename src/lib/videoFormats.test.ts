import { describe, it, expect } from "vitest";
import {
  PLAYABLE_VIDEO_ACCEPT,
  decodeFailureHint,
  unplayableVideoReason,
} from "./videoFormats";

describe("unplayableVideoReason", () => {
  it("rejects containers no browser can decode", () => {
    // These were in the accept lists, so they uploaded fine and then played
    // as a black frame — the file was stored and the lesson was broken.
    for (const name of ["lesson.mkv", "lesson.avi", "clip.wmv", "old.flv"]) {
      expect(unplayableVideoReason(name)).toBeTruthy();
    }
  });

  it("names the format and says what to convert to", () => {
    const reason = unplayableVideoReason("day-one.mkv");
    expect(reason).toMatch(/MKV/);
    expect(reason).toMatch(/MP4/);
  });

  it("accepts what browsers actually play", () => {
    for (const name of ["a.mp4", "b.webm", "c.mov", "d.m4v"]) {
      expect(unplayableVideoReason(name)).toBeNull();
    }
  });

  it("is case-insensitive, since phones produce .MP4 and .MOV", () => {
    expect(unplayableVideoReason("CLIP.MP4")).toBeNull();
    expect(unplayableVideoReason("CLIP.MKV")).toBeTruthy();
  });

  it("passes a file with no extension rather than guessing", () => {
    expect(unplayableVideoReason("recording")).toBeNull();
  });

  it("offers only playable extensions to the file dialog", () => {
    expect(PLAYABLE_VIDEO_ACCEPT).not.toMatch(/mkv|avi/);
    expect(PLAYABLE_VIDEO_ACCEPT).toMatch(/\.mp4/);
  });
});

describe("decodeFailureHint", () => {
  it("calls out MOV, where the container plays but the codec often does not", () => {
    expect(decodeFailureHint("https://cdn/x/lesson.mov")).toMatch(/ProRes|HEVC/);
  });

  it("falls back to a general codec explanation", () => {
    expect(decodeFailureHint("https://cdn/x/lesson.mp4")).toMatch(/H\.264/);
  });

  it("survives a missing url", () => {
    expect(decodeFailureHint(null)).toBeTruthy();
  });
});
