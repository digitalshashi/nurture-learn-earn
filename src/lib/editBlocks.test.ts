import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  applyEditBlocks,
  hasUnclosedBlock,
  parseEditBlocks,
} from "../../supabase/functions/_shared/editBlocks";

const block = (search: string, replace: string) =>
  `<<<<<<< SEARCH\n${search}\n=======\n${replace}\n>>>>>>> REPLACE`;

const PAGE = `<!doctype html>
<html lang="en">
<head>
<style>
  .hero { padding: 4rem 2rem; }
  .cta { background: #111; }
</style>
</head>
<body>
  <header class="hero">
    <h1>Learn to design</h1>
  </header>
  <main>
    <section class="benefits">Benefits</section>
  </main>
</body>
</html>`;

describe("parseEditBlocks", () => {
  it("reads a single block", () => {
    expect(parseEditBlocks(block("old", "new"))).toEqual([{ search: "old", replace: "new" }]);
  });

  it("reads several blocks from one reply", () => {
    const reply = `${block("a", "b")}\n\n${block("c", "d")}`;
    expect(parseEditBlocks(reply)).toHaveLength(2);
  });

  it("keeps multi-line search and replace text intact", () => {
    const [parsed] = parseEditBlocks(block("line one\nline two", "only one line"));
    expect(parsed.search).toBe("line one\nline two");
    expect(parsed.replace).toBe("only one line");
  });

  it("reads a deletion, where the replacement is empty", () => {
    const [parsed] = parseEditBlocks("<<<<<<< SEARCH\ngone\n=======\n\n>>>>>>> REPLACE");
    expect(parsed.replace).toBe("");
  });

  it("ignores a block that is still being written", () => {
    // Mid-stream this is exactly what arrives, and acting on half a block
    // would replace text with nothing.
    expect(parseEditBlocks("<<<<<<< SEARCH\nhalf a block")).toEqual([]);
  });

  it("ignores prose around the blocks", () => {
    const reply = `Sure, here you go:\n\n${block("old", "new")}\n\nLet me know!`;
    expect(parseEditBlocks(reply)).toEqual([{ search: "old", replace: "new" }]);
  });
});

describe("hasUnclosedBlock", () => {
  it("is true while a block is open", () => {
    expect(hasUnclosedBlock("<<<<<<< SEARCH\nsomething")).toBe(true);
    expect(hasUnclosedBlock(`${block("a", "b")}\n<<<<<<< SEARCH\nnext`)).toBe(true);
  });

  it("is false once every block has closed", () => {
    expect(hasUnclosedBlock(block("a", "b"))).toBe(false);
    expect(hasUnclosedBlock(`${block("a", "b")}\n${block("c", "d")}`)).toBe(false);
    expect(hasUnclosedBlock("")).toBe(false);
  });
});

describe("applyEditBlocks", () => {
  it("changes only what the block names", () => {
    const { html, applied } = applyEditBlocks(PAGE, [
      { search: "<h1>Learn to design</h1>", replace: "<h1>Design for a living</h1>" },
    ]);

    expect(applied).toBe(1);
    expect(html).toContain("Design for a living");
    // Everything else must survive byte for byte — this is the whole point.
    expect(html).toContain(".hero { padding: 4rem 2rem; }");
    expect(html).toContain('<section class="benefits">Benefits</section>');
    expect(html.length).toBeGreaterThan(PAGE.length - 20);
  });

  it("inserts a section by repeating its anchor", () => {
    const { html, applied } = applyEditBlocks(PAGE, [
      {
        search: '    <section class="benefits">Benefits</section>',
        replace:
          '    <section class="benefits">Benefits</section>\n    <section class="pricing">Pricing</section>',
      },
    ]);

    expect(applied).toBe(1);
    expect(html).toContain('<section class="pricing">Pricing</section>');
    expect(html).toContain('<section class="benefits">Benefits</section>');
  });

  it("deletes when the replacement is empty", () => {
    const { html } = applyEditBlocks(PAGE, [
      { search: '    <section class="benefits">Benefits</section>\n', replace: "" },
    ]);
    expect(html).not.toContain("Benefits");
    expect(html).toContain("Learn to design");
  });

  it("applies several blocks in one pass", () => {
    const { html, applied, failed } = applyEditBlocks(PAGE, [
      { search: "  .cta { background: #111; }", replace: "  .cta { background: #e2563f; }" },
      { search: "<h1>Learn to design</h1>", replace: "<h1>Design for a living</h1>" },
    ]);

    expect(applied).toBe(2);
    expect(failed).toEqual([]);
    expect(html).toContain("#e2563f");
    expect(html).toContain("Design for a living");
  });

  it("still matches when the model re-indents what it quoted", () => {
    // Models reproduce the text but not always the whitespace, and dropping
    // those edits would waste most of them.
    const { html, applied } = applyEditBlocks(PAGE, [
      { search: "<header class='hero'>", replace: "x" },
      { search: ".hero {  padding: 4rem 2rem;  }", replace: "  .hero { padding: 6rem 2rem; }" },
    ]);

    expect(applied).toBe(1);
    expect(html).toContain("padding: 6rem 2rem");
  });

  it("reports a block it cannot place instead of guessing", () => {
    // A replacement in the wrong place is far worse than a change that did
    // not happen, because nobody would think to look for it.
    const { html, applied, failed } = applyEditBlocks(PAGE, [
      { search: "<h2>Something that is not there</h2>", replace: "<h2>New</h2>" },
    ]);

    expect(applied).toBe(0);
    expect(failed).toHaveLength(1);
    expect(html).toBe(PAGE);
  });

  it("rejects an empty search rather than replacing at position zero", () => {
    const { html, applied, failed } = applyEditBlocks(PAGE, [{ search: "   ", replace: "oops" }]);
    expect(applied).toBe(0);
    expect(failed).toEqual(["(empty search)"]);
    expect(html).toBe(PAGE);
  });

  it("treats $& in replacement markup as literal text", () => {
    // String.replace would otherwise expand it into the matched text.
    const { html } = applyEditBlocks("<p>price</p>", [
      { search: "<p>price</p>", replace: "<p>Save $&pound;50</p>" },
    ]);
    expect(html).toBe("<p>Save $&pound;50</p>");
  });

  it("replaces only the first occurrence, not every one", () => {
    // A short search that appears twice must not rewrite both — the model is
    // told to make SEARCH unique, and a silent double edit hides the mistake.
    const doc = "<p>hi</p>\n<p>hi</p>";
    const { html } = applyEditBlocks(doc, [{ search: "<p>hi</p>", replace: "<p>bye</p>" }]);
    expect(html).toBe("<p>bye</p>\n<p>hi</p>");
  });
});

describe("the editor asks for changes, not rewrites", () => {
  const fn = readFileSync("supabase/functions/generate-page/index.ts", "utf8");
  const editor = readFileSync("src/pages/PageEditor.tsx", "utf8");

  it("asks for search-and-replace blocks when editing", () => {
    expect(fn).toContain("You make surgical edits — never rewrites.");
    expect(fn).toContain("<<<<<<< SEARCH");
    expect(fn).toMatch(/Change nothing you were not asked to/);
  });

  it("applies them to the page that already exists", () => {
    expect(fn).toContain("applyEditBlocks(existingHtml, blocks)");
  });

  it("falls back to a full rewrite only when nothing matched", () => {
    // A change that silently does nothing is worse than a slower rewrite.
    expect(fn).toContain("REWRITE_SYSTEM");
    expect(fn).toContain("if (result.applied > 0)");
  });

  it("does not render change blocks as if they were a page", () => {
    expect(editor).toContain("streamMode");
    expect(editor).toContain('streamMode.current === "edit"');
  });

  it("says how many changes landed", () => {
    expect(editor).toContain("changes");
    expect(fn).toContain("edits:");
  });
});
