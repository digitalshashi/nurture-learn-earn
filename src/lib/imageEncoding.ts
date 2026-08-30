// Everything that lands in storage as an image lands as WebP.
//
// Uploads arrive in whatever the device produced — JPEG and PNG from a laptop,
// HEIC from an iPhone, WebP or JPEG from an Android camera — and each of those
// is served to every future visitor exactly as uploaded. WebP is typically
// 25-35% smaller than the same JPEG and supports transparency, so converting
// once at upload pays for itself on every page view afterwards.
//
// Three formats are deliberately left alone:
//
//   SVG           — a vector. Rasterising a logo to WebP would fix it at one
//                   size and lose the transparency-scaling that is the entire
//                   reason it is an SVG. It is also already tiny.
//   Animated GIF  — a canvas holds one frame, so converting would silently
//                   throw away every frame after the first. Static GIFs have
//                   no such problem and are converted.
//   WebP          — already there.
//
// Conversion never blocks an upload. If the browser cannot decode the file
// (Chrome and Firefox cannot read HEIC) or cannot encode WebP, the original
// goes up unchanged. A picture that uploads in the wrong format beats a
// picture that does not upload.

import { readFileBytes } from "@/lib/fileBytes";

export const WEBP_TYPE = "image/webp";

/** Raster formats worth converting, by MIME type. */
const CONVERTIBLE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/x-windows-bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "image/avif",
]);

/**
 * The same list by extension.
 *
 * Needed because `File.type` is not reliable: HEIC from an iPhone often
 * arrives as an empty string, and files dragged from some Android file
 * managers arrive as application/octet-stream.
 */
const CONVERTIBLE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "jpe",
  "png",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
]);

export type ConversionPlan =
  | { convert: true }
  | { convert: false; reason: "not-an-image" | "svg" | "already-webp" };

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function isSvg(file: { name?: string; type?: string }): boolean {
  return file.type === "image/svg+xml" || extensionOf(file.name ?? "") === "svg";
}

/**
 * Whether this file should become WebP, judged on type and extension only.
 *
 * Animated GIFs still say `convert: true` here — telling them apart needs the
 * bytes, which convertImageToWebp reads.
 */
export function planConversion(file: { name?: string; type?: string }): ConversionPlan {
  if (isSvg(file)) return { convert: false, reason: "svg" };

  const type = (file.type ?? "").toLowerCase();
  const extension = extensionOf(file.name ?? "");

  if (type === WEBP_TYPE || extension === "webp") {
    return { convert: false, reason: "already-webp" };
  }

  if (CONVERTIBLE_TYPES.has(type) || CONVERTIBLE_EXTENSIONS.has(extension)) {
    return { convert: true };
  }

  return { convert: false, reason: "not-an-image" };
}

/** Swaps a filename's extension for .webp, adding one if it had none. */
export function webpName(name: string): string {
  const trimmed = (name || "image").trim() || "image";
  const dot = trimmed.lastIndexOf(".");
  // A leading dot is the whole name (".gitignore"), not an extension.
  return dot > 0 ? `${trimmed.slice(0, dot)}.webp` : `${trimmed}.webp`;
}

/** Same, for an object key that may contain slashes. */
export function webpPath(path: string): string {
  const cut = path.lastIndexOf("/");
  if (cut === -1) return webpName(path);
  return `${path.slice(0, cut + 1)}${webpName(path.slice(cut + 1))}`;
}

/**
 * Counts frames by walking the GIF block structure.
 *
 * Searching for the 0x2C image-separator byte would be far shorter and wrong:
 * 0x2C is an ordinary byte inside colour tables and compressed pixel data, so
 * a plain scan reports almost every GIF as animated and nothing would ever
 * convert. Stops as soon as a second frame is found.
 */
export function countGifFrames(bytes: Uint8Array): number {
  // "GIF87a" / "GIF89a", then the logical screen descriptor.
  if (bytes.length < 13) return 0;

  let at = 10;
  const packed = bytes[at];
  at = 13;

  // Global colour table, if the flag in the packed field is set.
  if (packed & 0x80) at += 3 * (1 << ((packed & 0x07) + 1));

  /** Sub-blocks run until a zero-length one. */
  const skipSubBlocks = () => {
    while (at < bytes.length) {
      const size = bytes[at++];
      if (size === 0) return;
      at += size;
    }
  };

  let frames = 0;

  while (at < bytes.length) {
    const marker = bytes[at++];

    if (marker === 0x21) {
      at++; // extension label
      skipSubBlocks();
      continue;
    }

    if (marker === 0x2c) {
      frames++;
      if (frames > 1) return frames;
      at += 8; // position and size
      const localPacked = bytes[at++];
      if (localPacked & 0x80) at += 3 * (1 << ((localPacked & 0x07) + 1));
      at++; // LZW minimum code size
      skipSubBlocks();
      continue;
    }

    // Trailer, or a byte the structure does not allow.
    break;
  }

  return frames;
}

export async function isAnimatedGif(file: Blob): Promise<boolean> {
  try {
    return countGifFrames(await readFileBytes(file)) > 1;
  } catch {
    // Unreadable is not worth guessing about; treat it as animated so it is
    // passed through untouched rather than flattened to a single frame.
    return true;
  }
}

export interface ConversionResult {
  /** The file to upload — converted, or the original when it was left alone. */
  file: File | Blob;
  converted: boolean;
  /** Why it was left alone, for logging. Absent when it was converted. */
  reason?: string;
}

const asIs = (file: File | Blob, reason: string): ConversionResult => ({
  file,
  converted: false,
  reason,
});

/**
 * Converts an image to WebP in the browser, or returns it untouched.
 *
 * Quality 0.82 is the usual sweet spot: visually indistinguishable from the
 * source on photographs while still clearly smaller than the equivalent JPEG.
 */
export async function convertImageToWebp(
  file: File | Blob,
  options: { quality?: number } = {},
): Promise<ConversionResult> {
  const name = (file as File).name ?? "";
  const plan = planConversion({ name, type: file.type });
  if (!plan.convert) return asIs(file, (plan as { reason: string }).reason);

  const looksGif = file.type === "image/gif" || extensionOf(name) === "gif";
  if (looksGif && (await isAnimatedGif(file))) return asIs(file, "animated-gif");

  // No canvas at all — server-side rendering, or a test environment.
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
    return asIs(file, "no-canvas");
  }

  let bitmap: ImageBitmap | null = null;
  try {
    // `from-image` applies the EXIF orientation tag. Without it, a photo taken
    // on a phone held sideways decodes upright-but-rotated, and the rotation
    // is baked into the WebP because canvas output carries no EXIF at all.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");
    if (!context) return asIs(file, "no-2d-context");

    context.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, WEBP_TYPE, options.quality ?? 0.82),
    );

    // A browser that cannot encode WebP does not fail — toBlob quietly hands
    // back a PNG instead, which would then be stored under a .webp name.
    if (!blob || blob.type !== WEBP_TYPE) return asIs(file, "webp-unsupported");

    return {
      file: new File([blob], webpName(name || "image"), {
        type: WEBP_TYPE,
        lastModified: Date.now(),
      }),
      converted: true,
    };
  } catch {
    // Most often a format the browser cannot decode — HEIC everywhere except
    // Safari. The original still uploads.
    return asIs(file, "decode-failed");
  } finally {
    bitmap?.close();
  }
}
