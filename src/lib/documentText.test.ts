import { describe, it, expect } from "vitest";
import { strToU8, zipSync } from "fflate";

import {
  combineDocuments,
  describeExtract,
  extractDocumentText,
  MAX_CHARS_PER_FILE,
  MAX_CHARS_TOTAL,
  UnreadableDocument,
  type ExtractedDocument,
} from "./documentText";

/**
 * Real Office files, built in memory.
 *
 * DOCX, PPTX and XLSX are a ZIP of XML parts, so a genuine one can be zipped
 * here rather than stubbed — which means these tests exercise the actual
 * unzip-and-parse path instead of a mock of it.
 */
const office = (name: string, parts: Record<string, string>) =>
  new File(
    [zipSync(Object.fromEntries(Object.entries(parts).map(([p, xml]) => [p, strToU8(xml)])))],
    name,
  );

const docx = (paragraphs: string[]) =>
  office("workbook.docx", {
    "word/document.xml":
      `<?xml version="1.0"?><w:document><w:body>` +
      paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join("") +
      `</w:body></w:document>`,
  });

const pptx = (slides: string[]) =>
  office(
    "deck.pptx",
    Object.fromEntries(
      slides.map((text, i) => [
        `ppt/slides/slide${i + 1}.xml`,
        `<?xml version="1.0"?><p:sld><p:cSld><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:cSld></p:sld>`,
      ]),
    ),
  );

const text = (name: string, body: string) => new File([body], name, { type: "text/plain" });

describe("Word documents", () => {
  it("reads the paragraphs out of a .docx", async () => {
    const result = await extractDocumentText(docx(["Module one", "Module two"]));

    expect(result.text).toContain("Module one");
    expect(result.text).toContain("Module two");
    expect(result.unitLabel).toBe("page");
  });

  it("keeps paragraphs on separate lines rather than running them together", async () => {
    const result = await extractDocumentText(docx(["First point", "Second point"]));
    expect(result.text).not.toContain("First pointSecond point");
  });

  it("decodes XML entities", async () => {
    const result = await extractDocumentText(docx(["Profit &amp; Loss &lt;draft&gt;"]));
    expect(result.text).toContain("Profit & Loss <draft>");
  });

  it("does not pick up formatting attributes as if they were words", async () => {
    const noisy = office("styled.docx", {
      "word/document.xml":
        `<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>` +
        `<w:r><w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr><w:t>Real content</w:t></w:r>` +
        `</w:p></w:body></w:document>`,
    });

    const result = await extractDocumentText(noisy);
    expect(result.text).toBe("Real content");
    expect(result.text).not.toContain("Calibri");
    expect(result.text).not.toContain("Heading1");
  });
});

describe("PowerPoint decks", () => {
  it("reads every slide", async () => {
    const result = await extractDocumentText(pptx(["Opening", "The method", "Next steps"]));

    expect(result.units).toBe(3);
    expect(result.unitLabel).toBe("slide");
    for (const slide of ["Opening", "The method", "Next steps"]) {
      expect(result.text).toContain(slide);
    }
  });

  it("keeps slides in numeric order, not alphabetical", async () => {
    // slide10 sorts before slide2 as a string, which would silently scramble
    // the running order of any deck with ten or more slides.
    const deck = pptx(Array.from({ length: 12 }, (_, i) => `Slide number ${i + 1}`));
    const result = await extractDocumentText(deck);

    expect(result.text.indexOf("Slide number 2")).toBeLessThan(
      result.text.indexOf("Slide number 10"),
    );
  });
});

describe("Excel workbooks", () => {
  it("reads the shared string table", async () => {
    const workbook = office("numbers.xlsx", {
      "xl/sharedStrings.xml": `<sst><si><t>Revenue</t></si><si><t>Expenses</t></si></sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData/></worksheet>`,
    });

    const result = await extractDocumentText(workbook);
    expect(result.text).toContain("Revenue");
    expect(result.text).toContain("Expenses");
  });
});

describe("plain and marked-up text", () => {
  it("reads a text file", async () => {
    const result = await extractDocumentText(text("notes.txt", "Day one: pick a niche"));
    expect(result.text).toBe("Day one: pick a niche");
    expect(result.unitLabel).toBeNull();
  });

  it("strips markup and scripts from HTML", async () => {
    const page = new File(
      ["<html><head><style>p{color:red}</style><script>alert(1)</script></head><body><h1>Title</h1><p>Body text</p></body></html>"],
      "page.html",
      { type: "text/html" },
    );

    const result = await extractDocumentText(page);
    expect(result.text).toContain("Title");
    expect(result.text).toContain("Body text");
    expect(result.text).not.toContain("alert");
    expect(result.text).not.toContain("color:red");
  });
});

describe("files it cannot read", () => {
  it("names the format and the fix for a legacy .doc", async () => {
    await expect(extractDocumentText(text("old.doc", "junk"))).rejects.toThrow(UnreadableDocument);
    await expect(extractDocumentText(text("old.doc", "junk"))).rejects.toThrow(/Save As/);
  });

  it("refuses a format it has no reader for", async () => {
    await expect(extractDocumentText(text("clip.mp4", "junk"))).rejects.toThrow(
      /not a document format/,
    );
  });

  it("says a scanned document needs OCR rather than returning nothing", async () => {
    // An empty extract almost always means the pages are images of text.
    await expect(extractDocumentText(docx([""]))).rejects.toThrow(/OCR/);
  });

  it("explains an Office file with no document part", async () => {
    const empty = office("broken.docx", { "docProps/app.xml": "<Properties/>" });
    await expect(extractDocumentText(empty)).rejects.toThrow(/no readable document part/);
  });
});

describe("limits", () => {
  it("truncates a file that is longer than a model can be given", async () => {
    const huge = text("book.txt", "word ".repeat(MAX_CHARS_PER_FILE));
    const result = await extractDocumentText(huge);

    expect(result.truncated).toBe(true);
    expect(result.chars).toBe(MAX_CHARS_PER_FILE);
    expect(result.text.length).toBe(MAX_CHARS_PER_FILE);
  });

  it("labels each document so the model can tell them apart", () => {
    const docs: ExtractedDocument[] = [
      { fileName: "workbook.docx", text: "A", chars: 1, units: 1, unitLabel: "page", truncated: false },
      { fileName: "deck.pptx", text: "B", chars: 1, units: 1, unitLabel: "slide", truncated: false },
    ];

    const combined = combineDocuments(docs);
    expect(combined.text).toContain("--- workbook.docx ---");
    expect(combined.text).toContain("--- deck.pptx ---");
    expect(combined.truncated).toBe(false);
  });

  it("caps the combined set so ten files cannot blow the context window", () => {
    const docs: ExtractedDocument[] = Array.from({ length: 10 }, (_, i) => ({
      fileName: `file${i}.txt`,
      text: "x".repeat(MAX_CHARS_PER_FILE),
      chars: MAX_CHARS_PER_FILE,
      units: null,
      unitLabel: null,
      truncated: false,
    }));

    const combined = combineDocuments(docs);
    expect(combined.text.length).toBe(MAX_CHARS_TOTAL);
    expect(combined.truncated).toBe(true);
  });

  it("carries a single file's truncation through to the combined set", () => {
    const combined = combineDocuments([
      { fileName: "a.txt", text: "short", chars: 5, units: null, unitLabel: null, truncated: true },
    ]);
    expect(combined.truncated).toBe(true);
  });
});

describe("describing an extract to the coach", () => {
  it("counts pages, slides and sheets by their own name", () => {
    const base = { fileName: "f", text: "", chars: 2400, truncated: false };
    expect(describeExtract({ ...base, units: 12, unitLabel: "page" })).toBe("12 pages · 2.4k characters");
    expect(describeExtract({ ...base, units: 1, unitLabel: "slide" })).toBe("1 slide · 2.4k characters");
    expect(describeExtract({ ...base, units: null, unitLabel: null })).toBe("2.4k characters");
  });
});
