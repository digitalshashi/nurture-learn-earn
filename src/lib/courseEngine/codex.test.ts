import { describe, it, expect } from "vitest";

import { detectCodex, hasUsableFields, readCodexFields } from "./codex";

/** A codex as it arrives out of a Word or Markdown template. */
const TABLE_CODEX = `
# Freedom Business Codex

| Field | Fill in |
|---|---|
| Course topic | Instagram content creation |
| Niche / audience | Beginners who want to start on Instagram |
| Starting pain | Zero followers and no idea what to post |
| Desired result | Their first income from content online |
| Coach name | Shashi Vanga |

## The 6 Transformation Steps
Step 1 — Niche & Profile Setup
`;

/** The same codex written as prose, which is how a Google Doc export reads. */
const PROSE_CODEX = `
Freedom Business Codex

Coach: Anita Rao
Topic: Fat loss for busy parents
Target audience: Working parents with no time to train
Starting pain: Exhausted, no routine, nothing has stuck
Desired result: Twelve kilos down and holding it

The 6 Transformation Steps follow. Inner Circle and value stack below.
`;

describe("recognising a codex", () => {
  it("knows a codex from its vocabulary", () => {
    expect(detectCodex(TABLE_CODEX).isCodex).toBe(true);
    expect(detectCodex(PROSE_CODEX).isCodex).toBe(true);
  });

  it("does not mistake ordinary material for one", () => {
    // A single stray phrase is coincidence, not a codex.
    const transcript =
      "So today we are going to talk about the transformation step by step, okay? Let us begin.";
    expect(detectCodex(transcript).isCodex).toBe(false);
  });
});

describe("reading what the codex already states", () => {
  it("reads a table template", () => {
    expect(readCodexFields(TABLE_CODEX)).toEqual({
      topic: "Instagram content creation",
      audience: "Beginners who want to start on Instagram",
      starting_pain: "Zero followers and no idea what to post",
      desired_result: "Their first income from content online",
      coach_name: "Shashi Vanga",
    });
  });

  it("reads the same fields written as prose", () => {
    const fields = readCodexFields(PROSE_CODEX);

    expect(fields.coach_name).toBe("Anita Rao");
    expect(fields.topic).toBe("Fat loss for busy parents");
    expect(fields.audience).toBe("Working parents with no time to train");
    expect(fields.desired_result).toBe("Twelve kilos down and holding it");
  });

  it("leaves a template's own placeholders alone", () => {
    // A blank template filled nothing in. Copying "[What you teach]" into the
    // form would get skimmed past and shipped.
    const blank = `
| Course topic | [What you teach] |
| Niche / audience | [Who it's for] |
| Coach name | Your name here |
| Starting pain | TBD |
`;
    expect(readCodexFields(blank)).toEqual({});
  });

  it("ignores a value long enough to be a paragraph rather than a field", () => {
    const rambling = `Topic: ${"a very long answer ".repeat(20)}`;
    expect(readCodexFields(rambling).topic).toBeUndefined();
  });

  it("prefers the more specific label when a document has both", () => {
    const both = `
Audience: everyone
Target audience: Working parents with no time
`;
    // "target audience" appears second but is the one that means something.
    expect(readCodexFields(both).audience).toBe("everyone");
  });

  it("says whether there is enough to bother prefilling", () => {
    expect(hasUsableFields(readCodexFields(TABLE_CODEX))).toBe(true);
    expect(hasUsableFields({ topic: "One thing" })).toBe(false);
    expect(hasUsableFields({})).toBe(false);
  });
});
