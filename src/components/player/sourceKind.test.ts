import { describe, it, expect } from "vitest";
import { resolveSource, youtubeId, vimeoId } from "./sourceKind";

describe("resolveSource", () => {
  // The regression that sent uploaded MP4s to Chrome's built-in viewer: the old
  // check required video_type === "upload" or a "course-videos" path, but the
  // curriculum flow saves "direct" and files live on R2.
  it("plays an R2 upload saved as video_type 'direct' natively, not in an iframe", () => {
    const r2 = "https://media.example.com/9f8e/content/1717171717-lesson.mp4";
    expect(resolveSource(r2, "direct")).toEqual({ kind: "native", src: r2 });
  });

  it("plays an extension-less upload natively on the video_type hint alone", () => {
    const url = "https://media.example.com/9f8e/content/1717171717-lesson";
    expect(resolveSource(url, "upload").kind).toBe("native");
    expect(resolveSource(url, "direct").kind).toBe("native");
  });

  it("recognises native containers regardless of video_type", () => {
    for (const ext of ["mp4", "webm", "mov", "m4v"]) {
      expect(resolveSource(`https://cdn.example.com/a.${ext}`, null).kind).toBe("native");
    }
  });

  it("routes .m3u8 to the HLS engine", () => {
    const url = "https://cdn.example.com/vod/master.m3u8";
    expect(resolveSource(url, null)).toEqual({ kind: "hls", src: url });
    expect(resolveSource("https://cdn.example.com/vod/master", "hls").kind).toBe("hls");
  });

  it("survives query strings and signed-URL params", () => {
    expect(
      resolveSource("https://cdn.example.com/a.mp4?token=abc&expires=123", null).kind,
    ).toBe("native");
    expect(
      resolveSource("https://cdn.example.com/m.m3u8?sig=xyz", null).kind,
    ).toBe("hls");
  });

  it("extracts YouTube ids from every common url shape", () => {
    const cases = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ",
    ];
    for (const url of cases) {
      expect(resolveSource(url, null)).toEqual({ kind: "youtube", src: "dQw4w9WgXcQ" });
    }
  });

  it("extracts Vimeo ids from every common url shape", () => {
    const cases = [
      "https://vimeo.com/123456789",
      "https://player.vimeo.com/video/123456789",
      "https://vimeo.com/channels/staffpicks/123456789",
    ];
    for (const url of cases) {
      expect(resolveSource(url, null)).toEqual({ kind: "vimeo", src: "123456789" });
    }
  });

  it("converts Loom share links to embed links", () => {
    expect(resolveSource("https://www.loom.com/share/abc123", null)).toEqual({
      kind: "embed",
      src: "https://www.loom.com/embed/abc123",
    });
  });

  it("converts Google Drive links to preview links", () => {
    expect(resolveSource("https://drive.google.com/file/d/FILEID/view", null)).toEqual({
      kind: "embed",
      src: "https://drive.google.com/file/d/FILEID/preview",
    });
  });

  it("does not claim DASH support it lacks", () => {
    expect(resolveSource("https://cdn.example.com/a.mpd", null).kind).toBe("embed");
  });

  it("reports empty input as 'none'", () => {
    expect(resolveSource(null, "direct").kind).toBe("none");
    expect(resolveSource("", "direct").kind).toBe("none");
    expect(resolveSource("   ", "direct").kind).toBe("none");
  });

  it("falls back to an iframe for unknown providers", () => {
    expect(resolveSource("https://wistia.com/medias/abc", null).kind).toBe("embed");
  });
});

describe("id extraction", () => {
  it("returns null when there is no id to find", () => {
    expect(youtubeId("https://example.com/video")).toBeNull();
    expect(vimeoId("https://example.com/video")).toBeNull();
  });
});
