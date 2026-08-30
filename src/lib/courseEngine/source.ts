// Turning the coach's uploaded files into the one block a prompt receives.
//
// The blueprint stores the files, not a pre-joined blob. Storing both would
// keep two copies of up to 80k characters in the same jsonb column, and they
// would drift the moment a coach removed a file — the list would shrink while
// the text a generation actually used stayed exactly as it was.
//
// So the text is derived, here, from whatever files are attached right now.
// Kept free of any dependency on the file readers: this joins strings, and the
// engine stays testable without a browser.

import type { SourceFile } from "./types";

/**
 * Ceiling on the joined material.
 *
 * Mirrors MAX_CHARS_TOTAL in documentText.ts, which is where the reasoning
 * lives: every one of the five parallel generation calls carries this text, so
 * its length is multiplied by five on the coach's token bill.
 */
export const MAX_SOURCE_CHARS = 80_000;

/**
 * One labelled block per file.
 *
 * The filename headers matter. Without them three documents blend into one
 * anonymous wall of text and the model cannot say "your workbook puts it this
 * way" or tell a transcript apart from a slide deck.
 */
export function combineSourceFiles(
  files: SourceFile[],
  cap = MAX_SOURCE_CHARS,
): { text: string; truncated: boolean } {
  const joined = files
    .filter((file) => file.text.trim())
    .map((file) => `--- ${file.fileName} ---\n${file.text}`)
    .join("\n\n");

  if (joined.length > cap) return { text: joined.slice(0, cap), truncated: true };
  return { text: joined, truncated: files.some((file) => file.truncated) };
}

/** Characters of material attached, for showing a coach what the model gets. */
export function sourceCharCount(files: SourceFile[]): number {
  return files.reduce((total, file) => total + file.chars, 0);
}
