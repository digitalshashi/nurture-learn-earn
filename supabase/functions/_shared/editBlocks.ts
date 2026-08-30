// Applying a change to a page without rewriting it.
//
// Asking a model for the whole document back on every tweak spends the output
// budget of a fresh page on a one-line change, and quietly rewrites copy that
// was already settled — no model reproduces 900 lines verbatim. These blocks
// change what was asked for and leave the rest byte-for-byte alone.
//
// Pure string handling, deliberately: it is the part most worth testing.

/** One search-and-replace instruction from the model. */
export interface EditBlock {
  search: string;
  replace: string;
}

const EDIT_BLOCK_RE =
  /<{5,} SEARCH\s*\n([\s\S]*?)\n?={5,}\s*\n([\s\S]*?)\n?>{5,} REPLACE/g;

/** Every complete block in a reply. A half-written trailing block is ignored. */
export function parseEditBlocks(reply: string): EditBlock[] {
  const blocks: EditBlock[] = [];
  for (const match of reply.matchAll(EDIT_BLOCK_RE)) {
    blocks.push({ search: match[1], replace: match[2] });
  }
  return blocks;
}

/** True while a block has been opened but not yet closed. */
export function hasUnclosedBlock(reply: string): boolean {
  const opens = (reply.match(/<{5,} SEARCH/g) || []).length;
  const closes = (reply.match(/>{5,} REPLACE/g) || []).length;
  return opens > closes;
}

/** Escapes a string for use as a literal inside a regular expression. */
const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Applies edit blocks to a page.
 *
 * Exact match first. Failing that, a whitespace-insensitive match — a model
 * reproduces the text correctly but re-indents it often enough that dropping
 * those edits would waste most of them. A block that still cannot be found is
 * reported rather than guessed at: a replacement in the wrong place is far
 * worse than a change that did not happen.
 */
export function applyEditBlocks(
  html: string,
  blocks: EditBlock[],
): { html: string; applied: number; failed: string[] } {
  let out = html;
  let applied = 0;
  const failed: string[] = [];

  for (const block of blocks) {
    if (!block.search.trim()) {
      failed.push("(empty search)");
      continue;
    }

    if (out.includes(block.search)) {
      // A function replacement keeps $& and friends in the new markup literal.
      out = out.replace(block.search, () => block.replace);
      applied++;
      continue;
    }

    const loose = new RegExp(escapeRe(block.search.trim()).replace(/\s+/g, "\\s+"));
    if (loose.test(out)) {
      out = out.replace(loose, () => block.replace);
      applied++;
      continue;
    }

    failed.push(block.search.trim().slice(0, 80));
  }

  return { html: out, applied, failed };
}
