import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  hasFormatting,
  parseInline,
  parseRichText,
  richTextToPlain,
  type InlineNode,
} from "./richText";

/** Flattens a tree to "kind:text" pairs so assertions read as the shape, not the AST. */
function shape(nodes: InlineNode[]): string[] {
  return nodes.flatMap((n) => {
    if (n.type === "text") return [`text:${n.value}`];
    if (n.type === "break") return ["break"];
    if (n.type === "link") return [`link:${n.href}`, ...shape(n.children)];
    return [`${n.type}`, ...shape(n.children)];
  });
}

describe("inline formatting", () => {
  it("reads bold and italic", () => {
    expect(shape(parseInline("a **b** c"))).toEqual(["text:a ", "bold", "text:b", "text: c"]);
    expect(shape(parseInline("a *b* c"))).toEqual(["text:a ", "italic", "text:b", "text: c"]);
  });

  it("nests italic inside bold and the other way round", () => {
    expect(shape(parseInline("**bold *and* more**"))).toEqual([
      "bold",
      "text:bold ",
      "italic",
      "text:and",
      "text: more",
    ]);
    expect(shape(parseInline("*soft **hard** soft*"))).toEqual([
      "italic",
      "text:soft ",
      "bold",
      "text:hard",
      "text: soft",
    ]);
  });

  // The toolbar produces this the moment someone bolds a word already in
  // italics, so the parser has to read it back the same way.
  it("reads a triple marker as both at once", () => {
    expect(shape(parseInline("***both***"))).toEqual(["bold", "italic", "text:both"]);
    expect(shape(parseInline("a ***b*** c"))).toEqual([
      "text:a ",
      "bold",
      "italic",
      "text:b",
      "text: c",
    ]);
  });

  it("falls back to the shorter marker when the triple never closes", () => {
    expect(shape(parseInline("***b** c"))).toEqual(["bold", "text:*b", "text: c"]);
  });

  // Someone writing prose types stray asterisks all the time; eating them
  // would silently mangle the copy they were paid to write.
  it("leaves unbalanced and spaced markers alone", () => {
    expect(shape(parseInline("2 * 3 * 4"))).toEqual(["text:2 * 3 * 4"]);
    expect(shape(parseInline("a * b"))).toEqual(["text:a * b"]);
    expect(shape(parseInline("half **open"))).toEqual(["text:half **open"]);
    expect(shape(parseInline("****"))).toEqual(["text:****"]);
  });

  it("keeps a single newline as a line break", () => {
    expect(shape(parseInline("one\ntwo"))).toEqual(["text:one", "break", "text:two"]);
  });

  it("reads links", () => {
    expect(shape(parseInline("see [docs](https://x.dev) now"))).toEqual([
      "text:see ",
      "link:https://x.dev",
      "text:docs",
      "text: now",
    ]);
  });

  // A label stops at the first "]", so however brackets are nested the parse
  // can only ever produce a flat link — the renderer never has to cope with one.
  it("cannot produce a link inside a link", () => {
    const nested = (nodes: InlineNode[], insideLink = false): boolean =>
      nodes.some((n) => {
        if (n.type === "link") return insideLink || nested(n.children, true);
        if (n.type === "bold" || n.type === "italic") return nested(n.children, insideLink);
        return false;
      });

    for (const input of ["[a [b](u2) c](u1)", "[[x](u1)](u2)", "[**[y](u1)**](u2)"]) {
      expect(nested(parseInline(input))).toBe(false);
    }
  });

  it("shows a link with no target literally", () => {
    expect(shape(parseInline("[label]()"))).toEqual(["text:[label]()"]);
  });

  // The whole point of the format: markup characters are data, never markup.
  it("treats angle brackets as ordinary characters", () => {
    expect(shape(parseInline("<script>alert(1)</script>"))).toEqual([
      "text:<script>alert(1)</script>",
    ]);
  });
});

describe("block structure", () => {
  it("splits paragraphs on a blank line", () => {
    const blocks = parseRichText("first para\n\nsecond para");
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === "paragraph")).toBe(true);
  });

  it("groups consecutive bullets into one list", () => {
    const blocks = parseRichText("- one\n- two\n- three");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("bullets");
    expect(blocks[0].type === "bullets" && blocks[0].items).toHaveLength(3);
  });

  it("reads numbered lists, however they are punctuated", () => {
    const blocks = parseRichText("1. one\n2) two");
    expect(blocks[0].type).toBe("numbers");
    expect(blocks[0].type === "numbers" && blocks[0].items).toHaveLength(2);
  });

  it("starts a new list when the marker changes", () => {
    const blocks = parseRichText("- one\n1. two");
    expect(blocks.map((b) => b.type)).toEqual(["bullets", "numbers"]);
  });

  it("lets a list interrupt a paragraph without a blank line", () => {
    const blocks = parseRichText("You get:\n- one\n- two\nAnd that is all.");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "bullets", "paragraph"]);
  });

  it("formats inside list items", () => {
    const blocks = parseRichText("- **weekly** calls");
    expect(blocks[0].type === "bullets" && shape(blocks[0].items[0])).toEqual([
      "bold",
      "text:weekly",
      "text: calls",
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(parseRichText("")).toEqual([]);
    expect(parseRichText("   \n  ")).toEqual([]);
    expect(parseRichText(null)).toEqual([]);
  });
});

describe("richTextToPlain", () => {
  // Meta descriptions and card previews must not show the author's asterisks.
  it("drops the markup and collapses the whitespace", () => {
    expect(richTextToPlain("**Close** more deals\n\n- in *30* days")).toBe(
      "Close more deals in 30 days",
    );
  });

  it("keeps a link's label and drops its target", () => {
    expect(richTextToPlain("Read [the guide](https://x.dev)")).toBe("Read the guide");
  });

  it("is empty for empty input", () => {
    expect(richTextToPlain(null)).toBe("");
  });
});

// The reason this format exists rather than stored HTML. A description is
// written by one tenant and read by the public on a checkout page, so the
// renderer must stay a fixed set of elements — see pageBuilder.test.ts for the
// same rule applied to authored pages.
describe("how a description reaches the screen", () => {
  const renderer = readFileSync("src/components/ui/rich-text.tsx", "utf8");
  const editor = readFileSync("src/components/ui/rich-text-editor.tsx", "utf8");

  it("never injects authored text as markup", () => {
    for (const src of [renderer, editor]) {
      expect(src).not.toContain("dangerouslySetInnerHTML");
      expect(src).not.toContain("innerHTML");
      expect(src).not.toContain("contentEditable");
    }
  });

  it("passes link targets through the URL guard", () => {
    expect(renderer).toContain("safeUrl");
  });

  it("opens author links without handing over the tab", () => {
    expect(renderer).toContain('rel="noopener noreferrer nofollow"');
  });
});

describe("hasFormatting", () => {
  it("is false for ordinary prose", () => {
    expect(hasFormatting("Just a sentence.\n\nAnd another.")).toBe(false);
  });

  it("is true once anything is marked up", () => {
    expect(hasFormatting("A **bold** claim")).toBe(true);
    expect(hasFormatting("- a list")).toBe(true);
    expect(hasFormatting("[link](https://x.dev)")).toBe(true);
  });
});
