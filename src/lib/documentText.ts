// Reading a coach's own material so a course can be built from it.
//
// A coach who already has a workbook, a slide deck or a set of notes should
// not have to retype any of it into a form. This pulls the words out of
// whatever they upload, in the browser, and hands them to the generator as
// context.
//
// Extraction runs client-side on purpose. The material is often unpublished —
// a paid workbook, a client's brief — and there is no reason for it to touch a
// server to be read. It also keeps a 300-page PDF away from an edge function's
// time limit, and gives the coach the page count and a preview immediately.
//
// Formats:
//
//   PDF                  pdfjs-dist, loaded on demand — it is the largest
//                        dependency in the app and most uploads are not PDFs
//   DOCX / PPTX / XLSX   one zip reader. All three are a ZIP of XML parts, so
//                        one unzip plus a tag-stripper covers Word, PowerPoint
//                        and Excel rather than three separate libraries
//   TXT / MD / CSV etc.  read as text
//   DOC / PPT / XLS      refused with a reason. The pre-2007 formats are OLE
//                        compound binaries, not zips, and parsing them well is
//                        a project in itself — saying so beats a silent
//                        wall of mojibake

import { unzipSync } from "fflate";

import { readFileBytes, readFileText } from "@/lib/fileBytes";
import { combineSourceFiles } from "@/lib/courseEngine/source";

/**
 * How much text is kept from one file.
 *
 * Sized against what gets *sent*, not what a context window could hold. A full
 * generation makes five calls in parallel and every one of them carries the
 * material, so each 10k characters here costs roughly 12k input tokens per
 * generation. Around 60k characters — some 20 dense pages — is enough for a
 * model to take the structure, themes and vocabulary of a workbook; sending a
 * whole book five times over would cost far more and produce no better course.
 *
 * A longer file is truncated and the UI says so, because silently using a
 * third of a document is worse than admitting the limit.
 */
export const MAX_CHARS_PER_FILE = 60_000;

/** The whole set handed to one generation, across every file. */
export const MAX_CHARS_TOTAL = 80_000;

export interface ExtractedDocument {
  fileName: string;
  text: string;
  /** Characters kept. Differs from text.length only in that it is the truth. */
  chars: number;
  /** Pages for a PDF, slides for a deck, sheets for a workbook. */
  units: number | null;
  unitLabel: "page" | "slide" | "sheet" | null;
  truncated: boolean;
}

export class UnreadableDocument extends Error {}

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Pre-2007 Office files, which are OLE containers rather than zips. */
const LEGACY_OFFICE: Record<string, string> = {
  doc: "Word 97-2003 (.doc)",
  ppt: "PowerPoint 97-2003 (.ppt)",
  xls: "Excel 97-2003 (.xls)",
};

const OOXML: Record<string, { unit: "page" | "slide" | "sheet"; match: RegExp }> = {
  docx: { unit: "page", match: /^word\/document\.xml$/ },
  pptx: { unit: "slide", match: /^ppt\/slides\/slide\d+\.xml$/ },
  xlsx: { unit: "sheet", match: /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/ },
};

const PLAIN_TEXT = new Set(["txt", "md", "markdown", "csv", "tsv", "json", "rtf", "html", "htm", "xml", "vtt", "srt"]);

/**
 * Extensions never worth reading as text, whatever MIME type came with them.
 *
 * The text/* fallback below exists for the extensionless and the oddly-typed —
 * a .log, a file dragged out of an email. But browsers and file managers hand
 * over a surprising number of binaries as text/plain, and decoding an MP4 as
 * UTF-8 produces pages of replacement characters that look, to a model, like
 * material to write a course from.
 */
const NEVER_TEXT = new Set([
  "mp4", "mov", "avi", "mkv", "webm", "m4v", "wmv", "flv",
  "mp3", "wav", "m4a", "aac", "ogg", "flac",
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "heic", "heif", "avif", "svg",
  "zip", "rar", "7z", "gz", "tar", "dmg", "iso",
  "exe", "dll", "bin", "so", "apk", "woff", "woff2", "ttf", "otf",
]);

/** Every extension the picker should offer. */
export const SOURCE_ACCEPT = ".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.tsv,.json,.rtf,.html,.htm,.vtt,.srt";

/**
 * Collapses runs of whitespace without destroying paragraph breaks.
 *
 * The exotic spaces are not decoration: PDF and Word emit \u00a0 constantly, and
 * \u2007 / \u202f turn up inside numbers. Left alone they reach the prompt as
 * characters the model spends attention on. Written as escapes because a
 * literal one is invisible in source and impossible to review in a diff.
 */
function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00a0\u2007\u202f]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Text content of an OOXML part.
 *
 * Word and PowerPoint both put runs of text in <a:t> or <w:t>, and everything
 * else in the part is formatting. Taking those elements rather than stripping
 * all tags avoids pulling in style ids and relationship targets, which look
 * like words to a model and are not.
 */
function textFromOoxml(xml: string): string {
  const runs = xml.match(/<(?:w|a):t(?:\s[^>]*)?>([\s\S]*?)<\/(?:w|a):t>/g);

  const source = runs?.length
    ? runs.map((run) => run.replace(/<[^>]+>/g, "")).join(" ")
    : // Spreadsheets keep strings in <t> without a namespace prefix.
      (xml.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) ?? [])
        .map((run) => run.replace(/<[^>]+>/g, ""))
        .join(" ");

  return decodeEntities(source);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

/** Paragraph and line breaks survive as breaks rather than running together. */
function withBreaks(xml: string): string {
  return xml
    .replace(/<\/(w:p|a:p)>/g, "\n")
    .replace(/<(w:br|a:br)\s*\/?>/g, "\n");
}

async function readOoxml(
  file: File,
  kind: keyof typeof OOXML,
): Promise<{ text: string; units: number }> {
  const zip = unzipSync(await readFileBytes(file));
  const { match, unit } = OOXML[kind];

  const parts = Object.keys(zip)
    .filter((name) => match.test(name))
    // slide2 must not sort before slide10 the way a plain string sort would.
    .sort((a, b) => {
      const num = (name: string) => Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0);
      return num(a) - num(b) || a.localeCompare(b);
    });

  if (!parts.length) throw new UnreadableDocument("This file has no readable document part inside it.");

  const decoder = new TextDecoder();
  const chunks = parts.map((name) => textFromOoxml(withBreaks(decoder.decode(zip[name]))));

  // A deck reads as a deck when its slides stay separated.
  const joined = unit === "slide" ? chunks.join("\n\n") : chunks.join("\n");

  return { text: tidy(joined), units: parts.length };
}

/**
 * PDF text, via pdfjs.
 *
 * Imported dynamically so the ~1MB library and its worker stay out of the main
 * bundle — the app is already large enough to warn at build time, and a coach
 * who never uploads a PDF should never download a PDF parser.
 */
async function readPdf(file: File): Promise<{ text: string; units: number }> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // The loading task owns the worker, so it is the thing to tear down — the
  // document proxy has no destroy() of its own. Leaking it leaves a worker
  // thread alive per file the coach opens.
  const task = pdfjs.getDocument({ data: await readFileBytes(file) });
  const doc = await task.promise;

  try {
    const pages: string[] = [];

    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();

      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim(),
      );

      page.cleanup();

      // Stop reading a long document once there is more than any model will
      // be given anyway, rather than spending a minute parsing the rest.
      if (pages.join("\n").length > MAX_CHARS_PER_FILE) break;
    }

    return { text: tidy(pages.join("\n\n")), units: doc.numPages };
  } finally {
    await task.destroy();
  }
}

/**
 * Pulls the readable text out of one file.
 *
 * Throws UnreadableDocument with a sentence worth showing the coach; anything
 * else that goes wrong is genuinely unexpected.
 */
export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  const extension = extensionOf(file.name);

  const legacy = LEGACY_OFFICE[extension];
  if (legacy) {
    throw new UnreadableDocument(
      `${legacy} files cannot be read in the browser. Open it and "Save As" the modern format — .${extension}x — then upload that.`,
    );
  }

  let text = "";
  let units: number | null = null;
  let unitLabel: ExtractedDocument["unitLabel"] = null;

  if (extension === "pdf") {
    const result = await readPdf(file);
    text = result.text;
    units = result.units;
    unitLabel = "page";
  } else if (extension in OOXML) {
    const kind = extension as keyof typeof OOXML;
    const result = await readOoxml(file, kind);
    text = result.text;
    units = result.units;
    unitLabel = OOXML[kind].unit;
  } else if (
    PLAIN_TEXT.has(extension) ||
    (file.type.startsWith("text/") && !NEVER_TEXT.has(extension))
  ) {
    const raw = await readFileText(file);
    // Strip markup so an exported HTML page reads as prose.
    text = tidy(
      /^(html?|xml)$/.test(extension)
        ? decodeEntities(raw.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "))
        : raw,
    );
  } else {
    throw new UnreadableDocument(
      `.${extension || "this"} is not a document format this can read. Upload a PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx) or a text file.`,
    );
  }

  if (!text.trim()) {
    throw new UnreadableDocument(
      "No text could be read from this file. If it is a scan or photographs of pages, the words are pixels — it needs OCR first.",
    );
  }

  const truncated = text.length > MAX_CHARS_PER_FILE;

  return {
    fileName: file.name,
    text: truncated ? text.slice(0, MAX_CHARS_PER_FILE) : text,
    chars: truncated ? MAX_CHARS_PER_FILE : text.length,
    units,
    unitLabel,
    truncated,
  };
}

/**
 * Joins several documents into the single block handed to a prompt.
 *
 * Each is labelled with its filename so the model can say "as your workbook
 * puts it" rather than blending three sources into one anonymous mush, and the
 * whole thing is capped so a coach who uploads ten files does not silently
 * blow past the context window.
 */
export function combineDocuments(documents: ExtractedDocument[]): {
  text: string;
  truncated: boolean;
} {
  return combineSourceFiles(documents, MAX_CHARS_TOTAL);
}

/** "12 pages", "34 slides" — what the coach sees next to the filename. */
export function describeExtract(doc: ExtractedDocument): string {
  const size =
    doc.chars >= 1000 ? `${Math.round(doc.chars / 100) / 10}k characters` : `${doc.chars} characters`;

  if (!doc.units || !doc.unitLabel) return size;
  return `${doc.units} ${doc.unitLabel}${doc.units === 1 ? "" : "s"} · ${size}`;
}
