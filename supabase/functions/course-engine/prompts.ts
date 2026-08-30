// Prompts for the course engine, kept out of the handler so they can be read,
// diffed and rolled back on their own.
//
// Every prompt has the same six parts: role, fixed constraints passed as data,
// the coach's inputs, the approved six steps, the output contract, and the
// style rules. The constraints come from courseSkeleton.ts rather than being
// written out here, so the model is told exactly what the validator will check.

import { DEFAULT_BONUSES, FOUNDATION_DAYS, FOUNDATION_SLOTS, slotTableForPrompt } from "../_shared/courseSkeleton.ts";

export interface EngineInput {
  topic: string;
  audience: string;
  starting_pain: string;
  desired_result: string;
  coach_name: string;
  language?: string;
  /** The coach's own material, already extracted from their files client-side. */
  source?: string;
}

export interface Step {
  number: number;
  name: string;
  achievement: string;
}

/**
 * The rules that keep generated copy honest.
 *
 * A model asked to write course marketing will reach for percentages and
 * student quotes unprompted, and those end up on a sales page as claims the
 * coach never made and cannot support.
 */
const STYLE_RULES = [
  "Write in plain, simple language a beginner understands.",
  "Never invent testimonials, student quotes, statistics, percentages or earnings figures.",
  "Never attribute a quote to a real person.",
  "Never promise a guarantee.",
  "Be specific to this coach's topic. Generic filler that would fit any course is a failure.",
].join("\n- ");

/**
 * Code-mixed output degrades over a long generation — the model drifts back to
 * English by the end — so the rule is restated in every prompt rather than set
 * once at the top.
 */
function languageRule(language?: string): string {
  if (language === "te") {
    return "\nWrite all titles and descriptions in Telugu, in Telugu script.";
  }
  if (language === "tinglish") {
    return (
      "\nWrite in Tinglish: code-mixed Telugu and English within the same sentence. " +
      "Telugu words in Telugu script only, English words in English only. " +
      "Do not produce a separate full-Telugu or full-English version. " +
      "Keep this mix consistent all the way to the last line."
    );
  }
  return "";
}

/**
 * A hard ceiling on the material, independent of what the client sent.
 *
 * The app already caps extraction, but this endpoint is reachable with any
 * body, and every one of the five parallel part calls carries the material —
 * so an uncapped source would multiply straight into the coach's token bill.
 */
const MAX_SOURCE_CHARS = 80_000;

/**
 * The coach's own material, and what to do with it.
 *
 * The instruction matters as much as the text. Handed a document with no
 * framing, a model does one of two things: summarises it back — producing a
 * book report rather than a course — or ignores it and writes the generic
 * course it would have written anyway. Both are failures the coach spots
 * immediately, because uploading the file was the whole point.
 */
function sourceBlock(input: EngineInput): string {
  const material = input.source?.trim();
  if (!material) return "";

  return [
    "",
    "The coach has supplied their own material, below. Build from it:",
    "- Use their vocabulary, their examples and their framing, not generic ones.",
    "- Follow the order and the emphasis of the material where it makes sense.",
    "- Do not restate or summarise it. It is raw material for a course, not the course.",
    "- Do not invent facts, numbers, prices or claims that are not in it.",
    "- Where it is silent on something the format needs, write the sensible thing and keep it general.",
    "",
    "--- BEGIN COACH MATERIAL ---",
    material.slice(0, MAX_SOURCE_CHARS),
    "--- END COACH MATERIAL ---",
  ].join("\n");
}

function inputsBlock(input: EngineInput): string {
  return [
    `Topic: ${input.topic}`,
    `Audience: ${input.audience}`,
    `Where they are today: ${input.starting_pain}`,
    `Where they want to be: ${input.desired_result}`,
    `Coach: ${input.coach_name}`,
  ].join("\n");
}

function stepsBlock(steps: Step[]): string {
  return steps
    .map((step) => `${step.number}. ${step.name} — ${step.achievement}`)
    .join("\n");
}

const jsonContract = (shape: string) =>
  `Return ONLY valid JSON in exactly this shape. No markdown fences, no commentary, no preamble.\n${shape}`;

// ------------------------------------------------------- stage 1: steps ---

export const STEPS_SYSTEM =
  "You structure courses on the Freedom Business Model. You return JSON only.";

/**
 * The single highest-leverage call in the pipeline: everything downstream
 * references these six steps, so this gets its own call, its own validation
 * and a human checkpoint before anything else is generated.
 */
export function stepsPrompt(input: EngineInput, note?: string): string {
  return [
    "Derive the 6 Transformation Steps for this course.",
    "",
    "Rules, all of which are checked in code:",
    "- Exactly 6 steps, numbered 1 to 6.",
    "- Ordered by dependency: step 1 must come first, and each step must be possible only once the one before it is done.",
    "- Each name is 2 to 4 plain words. Not a sentence. Not a single word.",
    "- Together the six steps must fully deliver the transformation, with no gap and no step that could be skipped.",
    "- The achievement is a concrete outcome the student can point at, not a feeling.",
    "",
    inputsBlock(input),
    sourceBlock(input),
    languageRule(input.language),
    "",
    jsonContract('{ "steps": [{ "number": 1, "name": "string", "achievement": "string" }] }'),
    "",
    `Style:\n- ${STYLE_RULES}`,
    note ? `\n${note}` : "",
  ].join("\n");
}

// -------------------------------------------- stage 3a: foundation days ---

export const PARTS_SYSTEM =
  "You fill fixed slots in a Freedom Business Model course. The slot list is " +
  "given to you and never changes. You return JSON only.";

/**
 * One day at a time, not all fifteen videos at once.
 *
 * The fifteen-video call is the one that hits the token ceiling, and a reply
 * cut mid-object is worse than useless. Three small calls run in parallel, so
 * the wall-clock cost is the same and none of them is near the limit.
 */
export function foundationDayPrompt(
  input: EngineInput,
  steps: Step[],
  day: number,
  note?: string,
): string {
  const meta = FOUNDATION_DAYS.find((entry) => entry.day === day)!;
  const slots = FOUNDATION_SLOTS[day];

  return [
    `Write Day ${day} of the 3-day foundation course: "${meta.theme}".`,
    `Goal of this day: ${meta.goal}`,
    "",
    "The five slots are fixed. Write the title, what it covers, and the learner actions for each.",
    "Do not add a slot, remove one, reorder them, or change what a slot is for.",
    "",
    slots
      .map(
        (slot) =>
          `slot ${slot.slot} — ${slot.purpose}${slot.step_ref ? ` (this video teaches step ${slot.step_ref} and nothing else)` : ""}`,
      )
      .join("\n"),
    "",
    inputsBlock(input),
    sourceBlock(input),
    "",
    "The approved 6 steps, which you must not rename or renumber:",
    stepsBlock(steps),
    languageRule(input.language),
    "",
    "Each video needs a title a student would click, two or three sentences on what it covers, and 1 to 3 concrete learner actions.",
    "",
    jsonContract(
      '{ "videos": [{ "slot": 1, "title": "string", "covers": "string", "learner_actions": ["string"] }] }',
    ),
    "",
    `Style:\n- ${STYLE_RULES}`,
    note ? `\n${note}` : "",
  ].join("\n");
}

// -------------------------------------------------- stage 3b: bonuses -----

export function bonusesPrompt(input: EngineInput, steps: Step[], note?: string): string {
  return [
    "Write the 6 bonus courses that support the main skill.",
    "",
    "The six topics and their downloadable resources are fixed. Every bonus is exactly three videos:",
    "context (why this matters), content (the teaching plus the resource), next (what to do now and how it links back).",
    "",
    DEFAULT_BONUSES.map(
      (bonus) => `${bonus.number}. ${bonus.topic} — resource: ${bonus.resource} (${bonus.type})`,
    ).join("\n"),
    "",
    inputsBlock(input),
    sourceBlock(input),
    "",
    "The approved 6 steps of the main course, for linking back:",
    stepsBlock(steps),
    languageRule(input.language),
    "",
    jsonContract(
      '{ "bonuses": [{ "number": 1, "purpose": "string", "videos": [{ "slot": "context", "title": "string", "covers": "string" }] }] }',
    ),
    "",
    'The "slot" value must be exactly "context", "content" or "next".',
    "",
    `Style:\n- ${STYLE_RULES}`,
    note ? `\n${note}` : "",
  ].join("\n");
}

// ----------------------------------------------------- stage 3c: live -----

export function livePrompt(input: EngineInput, steps: Step[], note?: string): string {
  return [
    "Plan the live implementation classes.",
    "",
    "Rules, all of which are checked in code:",
    "- Between 6 and 12 sessions.",
    "- 1 to 3 sessions per transformation step.",
    "- Every one of the 6 steps must have at least one session. A step with no session is a failure.",
    "- Sessions run in step order: day 1 builds an earlier step than the last day.",
    "- Each session produces one finished, hands-on outcome the student leaves with. Not knowledge — a thing.",
    "",
    inputsBlock(input),
    sourceBlock(input),
    "",
    "The approved 6 steps:",
    stepsBlock(steps),
    languageRule(input.language),
    "",
    jsonContract(
      '{ "sessions": [{ "day": 1, "step_ref": 1, "title": "string", "taught": "string", "outcome": "string" }] }',
    ),
    "",
    `Style:\n- ${STYLE_RULES}`,
    note ? `\n${note}` : "",
  ].join("\n");
}

// ------------------------------------------------ one slot, on request ----

export type SlotTarget =
  | { kind: "foundation"; day: number; slot: number }
  | { kind: "bonus"; number: number; slot: string }
  | { kind: "live" };

/**
 * A suggestion for a single slot, for the coach writing by hand.
 *
 * Manual mode already has a formula suggestion for every slot at no cost. This
 * is for the one slot they are stuck on and want another angle for, so it is
 * asked to write something different from what is already there.
 */
export function slotPrompt(
  input: EngineInput,
  steps: Step[],
  target: SlotTarget,
  existing?: { title?: string; covers?: string },
): string {
  const describe = () => {
    if (target.kind === "foundation") {
      const slot = FOUNDATION_SLOTS[target.day]?.find((entry) => entry.slot === target.slot);
      const step = slot?.step_ref ? steps.find((entry) => entry.number === slot.step_ref) : null;
      return [
        `Day ${target.day}, slot ${target.slot} of the foundation course.`,
        `This slot's fixed purpose: ${slot?.purpose ?? "unknown"}.`,
        step ? `It teaches step ${step.number} — ${step.name} — and nothing else.` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (target.kind === "bonus") {
      const bonus = DEFAULT_BONUSES.find((entry) => entry.number === target.number);
      return [
        `Bonus ${target.number} — ${bonus?.topic ?? ""}, the "${target.slot}" video.`,
        `Its downloadable resource is the ${bonus?.resource ?? "resource"}.`,
      ].join("\n");
    }
    return "One live implementation class.";
  };

  return [
    "Write one slot of a Freedom Business Model course.",
    "",
    describe(),
    "",
    inputsBlock(input),
    sourceBlock(input),
    "",
    "The approved 6 steps:",
    stepsBlock(steps),
    languageRule(input.language),
    existing?.title || existing?.covers
      ? `\nWhat is written there now, which you should improve on rather than repeat:\n${existing.title ?? ""}\n${existing.covers ?? ""}`
      : "",
    "",
    jsonContract('{ "title": "string", "covers": "string", "learner_actions": ["string"] }'),
    "",
    `Style:\n- ${STYLE_RULES}`,
  ].join("\n");
}

/** The whole slot table, for a prompt that needs to see the shape at once. */
export const SLOT_TABLE = slotTableForPrompt();

// ------------------------------------------- reading a coach's codex ------

export const ANALYSE_SYSTEM =
  "You read a coach's own programme document and extract what it already says. " +
  "You return JSON only.";

/**
 * Turns a Freedom Business Codex into the inputs and the six steps.
 *
 * The codex is a template: the same headings, a different coach and a
 * different niche each time. So the instruction is to report what this one
 * says rather than to design anything — the earning model, the promise and
 * the vocabulary belong to the coach who wrote it, and inventing a better
 * version of them produces a course they will not recognise as theirs.
 *
 * Fields the document genuinely does not cover come back empty, not guessed.
 * An empty field is a question the coach can answer in one line; a plausible
 * wrong one is a mistake that ships.
 */
export function analysePrompt(material: string, note?: string): string {
  return [
    "Read the coach's document below and extract what it already states.",
    "",
    "Rules:",
    "- Report what the document says. Do not improve it, do not rewrite it, do not add to it.",
    "- Use the coach's own words and vocabulary wherever the document gives them.",
    "- If the document names an earning or monetisation model, carry it into the steps it belongs to.",
    "- Leave a field as an empty string if the document genuinely does not say. Never guess a name.",
    "- The six steps must be the ones the document teaches, in its order, if it has them.",
    "- If it has no clear six, derive them from what it does teach: 6 steps, 2 to 4 plain words each, ordered by dependency.",
    "",
    "--- BEGIN DOCUMENT ---",
    material.slice(0, MAX_SOURCE_CHARS),
    "--- END DOCUMENT ---",
    "",
    jsonContract(
      '{ "topic": "string", "audience": "string", "starting_pain": "string", ' +
        '"desired_result": "string", "coach_name": "string", ' +
        '"course_name": "string", "earning_model": "string", ' +
        '"steps": [{ "number": 1, "name": "string", "achievement": "string" }] }',
    ),
    "",
    `Style:\n- ${STYLE_RULES}`,
    note ? `\n${note}` : "",
  ].join("\n");
}
