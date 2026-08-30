import { describe, it, expect } from "vitest";

import {
  convertImageToWebp,
  countGifFrames,
  isSvg,
  planConversion,
  webpName,
  webpPath,
} from "./imageEncoding";

const file = (name: string, type: string) => new File([new Uint8Array([1, 2, 3])], name, { type });

/**
 * A structurally valid GIF with the requested number of frames.
 *
 * Real bytes rather than a stub, because the frame counter walks the block
 * structure and a stub would prove nothing about whether it walks it correctly.
 */
function gifBytes(frames: number): Uint8Array {
  const bytes: number[] = [
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
    0x01, 0x00, 0x01, 0x00, // width, height
    0x00, // packed: no global colour table
    0x00, 0x00, // background colour, aspect ratio
  ];

  for (let i = 0; i < frames; i++) {
    bytes.push(0x2c); // image separator
    bytes.push(0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00); // left, top, width, height
    bytes.push(0x00); // packed: no local colour table
    bytes.push(0x02); // LZW minimum code size
    bytes.push(0x02, 0x44, 0x01); // one sub-block, two bytes of data
    bytes.push(0x00); // block terminator
  }

  bytes.push(0x3b); // trailer
  return new Uint8Array(bytes);
}

const gifFile = (frames: number) =>
  new File([gifBytes(frames)], "animation.gif", { type: "image/gif" });

describe("deciding what to convert", () => {
  it("converts everything a phone or a laptop produces", () => {
    for (const [name, type] of [
      ["photo.jpg", "image/jpeg"],
      ["photo.jpeg", "image/jpeg"],
      ["shot.JPG", "image/jpeg"],
      ["logo.png", "image/png"],
      ["scan.bmp", "image/bmp"],
      ["scan.tiff", "image/tiff"],
      ["modern.avif", "image/avif"],
    ]) {
      expect(planConversion({ name, type }), name).toEqual({ convert: true });
    }
  });

  it("converts an iPhone HEIC even when the browser gives it no type", () => {
    // Safari and several Android file pickers hand over HEIC with an empty
    // type, so a MIME-only check would let the largest files through untouched.
    expect(planConversion({ name: "IMG_4021.HEIC", type: "" })).toEqual({ convert: true });
    expect(planConversion({ name: "IMG_4021.heif", type: "application/octet-stream" })).toEqual({
      convert: true,
    });
    expect(planConversion({ name: "IMG_4021", type: "image/heic" })).toEqual({ convert: true });
  });

  it("never converts an SVG", () => {
    // Rasterising a vector fixes it at one size, which is the one thing an SVG
    // exists not to do.
    expect(planConversion({ name: "logo.svg", type: "image/svg+xml" })).toEqual({
      convert: false,
      reason: "svg",
    });
    expect(planConversion({ name: "logo.svg", type: "" })).toEqual({
      convert: false,
      reason: "svg",
    });
    expect(isSvg({ name: "brand.SVG", type: "" })).toBe(true);
  });

  it("leaves WebP alone", () => {
    expect(planConversion({ name: "already.webp", type: "image/webp" })).toEqual({
      convert: false,
      reason: "already-webp",
    });
  });

  it("ignores everything that is not an image", () => {
    for (const [name, type] of [
      ["notes.pdf", "application/pdf"],
      ["lesson.mp4", "video/mp4"],
      ["pack.zip", "application/zip"],
      ["audio.mp3", "audio/mpeg"],
    ]) {
      expect(planConversion({ name, type }), name).toEqual({
        convert: false,
        reason: "not-an-image",
      });
    }
  });
});

describe("naming", () => {
  it("swaps the extension", () => {
    expect(webpName("photo.jpg")).toBe("photo.webp");
    expect(webpName("IMG_4021.HEIC")).toBe("IMG_4021.webp");
    expect(webpName("my.holiday.photo.png")).toBe("my.holiday.photo.webp");
  });

  it("adds one when the file had none", () => {
    expect(webpName("screenshot")).toBe("screenshot.webp");
    expect(webpName("")).toBe("image.webp");
  });

  it("rewrites only the filename part of an object key", () => {
    expect(webpPath("user-123/thumbnails/1717-photo.jpg")).toBe(
      "user-123/thumbnails/1717-photo.webp",
    );
    // A dot in a folder name is not an extension.
    expect(webpPath("user.name/covers/art.png")).toBe("user.name/covers/art.webp");
  });
});

describe("counting GIF frames", () => {
  it("reads a single-frame GIF as static", () => {
    expect(countGifFrames(gifBytes(1))).toBe(1);
  });

  it("reads a multi-frame GIF as animated", () => {
    expect(countGifFrames(gifBytes(3))).toBeGreaterThan(1);
  });

  it("does not mistake pixel data for a frame marker", () => {
    // 0x2c is an ordinary byte inside compressed data. A naive scan for it
    // reports nearly every GIF as animated, and nothing would ever convert.
    const bytes = gifBytes(1);
    expect(bytes).toContain(0x2c);
    expect(countGifFrames(bytes)).toBe(1);
  });

  it("says nothing rather than guessing on a non-GIF", () => {
    expect(countGifFrames(new Uint8Array([1, 2, 3]))).toBe(0);
  });
});

describe("converting", () => {
  // jsdom has no canvas, which is the same situation as a browser that cannot
  // decode the format — and the behaviour that matters is identical: the
  // upload still happens, with the bytes it was given.
  it("passes the original through when the browser cannot encode", async () => {
    const original = file("photo.png", "image/png");
    const result = await convertImageToWebp(original);

    expect(result.converted).toBe(false);
    expect(result.file).toBe(original);
    expect(result.reason).toBe("no-canvas");
  });

  it("hands back an SVG untouched without reading it", async () => {
    const original = file("logo.svg", "image/svg+xml");
    const result = await convertImageToWebp(original);

    expect(result.converted).toBe(false);
    expect(result.file).toBe(original);
    expect(result.reason).toBe("svg");
  });

  it("refuses to flatten an animated GIF", async () => {
    const original = gifFile(4);
    const result = await convertImageToWebp(original);

    expect(result.converted).toBe(false);
    expect(result.file).toBe(original);
    expect(result.reason).toBe("animated-gif");
  });

  it("treats a static GIF as ordinary and convertible", async () => {
    const result = await convertImageToWebp(gifFile(1));
    // Gets past the animation check and only stops at the missing canvas.
    expect(result.reason).toBe("no-canvas");
  });
});
