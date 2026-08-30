// Recognising a Freedom Business Codex, and reading what it already states.
//
// A codex is the master document behind a coach's programme: their niche, the
// transformation they sell, the way they earn from it. Two coaches in two
// niches produce two codexes with the same headings and completely different
// content — which is exactly what makes it worth reading properly rather than
// treating as another attachment.
//
// This file does the free half. Anything a codex states outright — "Coach:
// Shashi Vanga", "Niche: Instagram creators" — can be lifted with a regex, no
// model call, no waiting, no tokens. What is left, mainly the six steps and
// the shape of the transformation, needs the analyse_source call in the edge
// function, and that runs only when the coach asks for it.

/**
 * The five inputs a codex can state outright.
 *
 * Narrower than CourseInput on purpose: language and live_plan are not text a
 * document declares in a labelled line, and typing them in here would let a
 * stray "Language: something" overwrite a real setting with a string.
 */
export type CodexField =
  | "topic"
  | "audience"
  | "starting_pain"
  | "desired_result"
  | "coach_name";

export type CodexFields = Partial<Record<CodexField, string>>;

/**
 * Phrases a Freedom Business Codex contains and a stray transcript does not.
 *
 * Scored rather than matched one-by-one: any single phrase can appear by
 * accident in a long document, but three of them together is a codex.
 */
const CODEX_MARKERS = [
  "freedom business",
  "transformation step",
  "6-step",
  "six step",
  "inner circle",
  "value stack",
  "codex",
  "bonus course",
  "foundation course",
  "earning method",
];

export interface CodexSignals {
  isCodex: boolean;
  /** How many distinct markers were found. */
  score: number;
  matched: string[];
}

/** Whether this material looks like a codex rather than loose notes. */
export function detectCodex(text: string): CodexSignals {
  const haystack = text.toLowerCase();
  const matched = CODEX_MARKERS.filter((marker) => haystack.includes(marker));

  // Three is the point where coincidence stops being the likelier explanation.
  return { isCodex: matched.length >= 3, score: matched.length, matched };
}

/**
 * Labels a codex uses for each of the five inputs.
 *
 * Ordered by how specific they are: "target audience" is checked before
 * "audience" so the longer, less ambiguous label wins when a document has both.
 */
const FIELD_LABELS: { field: CodexField; labels: string[] }[] = [
  {
    field: "coach_name",
    labels: ["coach name", "coach", "instructor", "mentor", "created by", "your name"],
  },
  {
    field: "topic",
    labels: ["course topic", "what you teach", "topic", "subject", "core skill", "skill taught"],
  },
  {
    field: "audience",
    labels: [
      "niche / audience",
      "target audience",
      "ideal client",
      "ideal student",
      "who it is for",
      "who it's for",
      "target market",
      "audience",
      "niche",
    ],
  },
  {
    field: "starting_pain",
    labels: [
      "starting pain",
      "where they are today",
      "current situation",
      "the problem",
      "pain point",
      "starting point",
      "pain",
    ],
  },
  {
    field: "desired_result",
    labels: [
      "desired result",
      "desired outcome",
      "end result",
      "transformation",
      "the promise",
      "outcome",
      "result",
    ],
  },
];

/** Placeholder text a template still carries when nobody filled it in. */
const UNFILLED = /^(\[.*\]|<.*>|_+|-+|n\/?a|tbd|todo|fill in.*|your .*here)$/i;

const clean = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/^[|\s:—–-]+|[|\s]+$/g, "")
    .trim();

/**
 * Reads whatever the document states outright.
 *
 * Handles both prose labelling ("Coach name: Shashi Vanga") and the table rows
 * a Word or Markdown template produces ("| Coach name | Shashi Vanga |"),
 * because the same codex arrives in both shapes depending on what it was
 * written in.
 *
 * Deliberately conservative: a value that is still a placeholder, or that runs
 * on for a paragraph, is left for the coach or the model rather than filled in
 * wrongly. A wrong prefilled field is worse than an empty one — it gets
 * skimmed past and shipped.
 */
export function readCodexFields(text: string): CodexFields {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const found: CodexFields = {};

  for (const line of lines) {
    // "| Label | Value |" from a table, or "Label: Value" from prose.
    const cells = line.startsWith("|") ? line.split("|").map(clean).filter(Boolean) : null;
    const pair = cells && cells.length >= 2 ? [cells[0], cells.slice(1).join(" ")] : null;

    const colon = !pair ? line.match(/^([^:]{2,40}):\s*(.+)$/) : null;
    const [rawLabel, rawValue] = pair ?? (colon ? [colon[1], colon[2]] : [null, null]);
    if (!rawLabel || !rawValue) continue;

    const label = clean(rawLabel).toLowerCase().replace(/\*+/g, "");
    const value = clean(rawValue).replace(/\*+/g, "");

    if (!value || UNFILLED.test(value) || value.length > 200) continue;

    for (const { field, labels } of FIELD_LABELS) {
      if (found[field]) continue;
      if (labels.some((candidate) => label === candidate || label.endsWith(` ${candidate}`))) {
        found[field] = value;
        break;
      }
    }
  }

  return found;
}

/** True when the codex filled in enough that the form is worth showing filled. */
export function hasUsableFields(fields: CodexFields): boolean {
  return Object.values(fields).filter(Boolean).length >= 2;
}
