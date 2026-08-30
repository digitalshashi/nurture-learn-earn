// The canonical shape of a Freedom Business Model course blueprint.
//
// One shape, three ways of filling it. The formula builder, the manual editor
// and the AI pipeline all produce exactly this object, so everything
// downstream — the editor, the validator, the markdown export and the publish
// step that turns a blueprint into real courses/sections/chapters rows — is
// written once and works for all three. Adding a fourth way of authoring a
// course means writing a producer, not a second half of the app.
//
// The skeleton never changes across niches. Only the text inside the slots
// does. That is what makes this programmable rather than a writing prompt.

/**
 * How the blueprint was filled in.
 *
 * - `formula` — every slot composed deterministically from the five inputs and
 *   the six steps. No model call, instant, free, identical every time.
 * - `manual` — the coach writes each slot; the formula's output is offered
 *   beside the field as a suggestion they can accept, edit or ignore.
 * - `ai`     — the model fills the slots, with the formula as the fallback for
 *   anything it leaves blank or returns malformed.
 */
export type BlueprintMode = "formula" | "manual" | "ai";

/** `tinglish` is code-mixed Telugu/English within a sentence, not two versions. */
export type BlueprintLanguage = "en" | "te" | "tinglish";

/**
 * Where the blueprint is in its life.
 *
 * `steps_pending` is the human checkpoint: the six steps exist but the coach
 * has not approved them. Nothing downstream is generated until they do,
 * because everything downstream references them and regenerating six steps is
 * cheap while regenerating a whole course is not.
 */
export type BlueprintStatus =
  | "draft"
  | "steps_pending"
  | "steps_approved"
  | "generating"
  | "complete"
  | "failed";

/** Everything the engine needs from the coach before it can build anything. */
export interface CourseInput {
  topic: string;
  audience: string;
  starting_pain: string;
  desired_result: string;
  coach_name: string;
  /**
   * A day-by-day plan the coach already runs — a 7-day or 11-day challenge.
   * When present the engine keeps their exact days verbatim and only tags each
   * with the step it builds; it does not rewrite a plan that already works.
   */
  live_plan?: string[];
  language?: BlueprintLanguage;
  /**
   * The coach's own material, already read out of their files.
   *
   * Only the AI paths can write from it — the formula composes from the five
   * answers alone. It travels with the blueprint so a coach who generates
   * again months later does not have to find the workbook again.
   */
  source?: string;
}

/** One file the coach handed over, with the text read out of it. */
export interface SourceFile {
  fileName: string;
  /**
   * The extracted text.
   *
   * The blueprint stores the files, never a pre-joined blob. Keeping both
   * would hold two copies of up to 80k characters in one jsonb column, and
   * they would drift the moment a file was removed — the list would shrink
   * while the text a generation actually used stayed as it was.
   */
  text: string;
  chars: number;
  units: number | null;
  unitLabel: "page" | "slide" | "sheet" | null;
  truncated: boolean;
}

export interface SourceMaterial {
  files: SourceFile[];
  truncated: boolean;
  /**
   * Set when the material was recognised as a Freedom Business Codex — the
   * master document that already carries a coach's niche, method and earning
   * model. A codex can fill the whole blueprint on its own; a loose transcript
   * is only context.
   */
  isCodex?: boolean;
}

/** One of exactly six, named in 2-4 plain words, ordered by dependency. */
export interface TransformationStep {
  number: number;
  name: string;
  achievement: string;
}

export interface FoundationVideo {
  /** 1-5 within the day. */
  slot: number;
  /**
   * The frozen purpose of this slot, from FOUNDATION_SLOTS. Rendered as a
   * locked label in the editor and compared against the table on validation —
   * neither a coach nor a model gets to invent a slot, because the fixed
   * running order is what makes the three days build belief.
   */
  slot_purpose: string;
  title: string;
  covers: string;
  learner_actions: string[];
  /** Which transformation step this video teaches, or null for the framing slots. */
  step_ref: number | null;
}

export interface FoundationDay {
  day: number;
  theme: string;
  goal: string;
  videos: FoundationVideo[];
}

export type BonusSlot = "context" | "content" | "next";

export interface BonusVideo {
  slot: BonusSlot;
  title: string;
  covers: string;
}

export interface BonusResource {
  name: string;
  type: "pdf" | "sheet";
}

export interface Bonus {
  number: number;
  topic: string;
  purpose: string;
  videos: BonusVideo[];
  resource: BonusResource;
}

export interface LiveSession {
  day: number;
  /** 1-6. Every session builds exactly one step, and every step needs a session. */
  step_ref: number;
  title: string;
  taught: string;
  outcome: string;
}

export interface InnerCircleCall {
  cadence: "weekly" | "fortnightly" | "monthly";
  title: string;
  purpose: string;
}

/**
 * The continuity part of the offer.
 *
 * The three recorded days and the bonuses are finite: a student finishes them
 * and is done. The vault is what they stay for — a place the coach keeps
 * adding to, with a call on the calendar. It is created with every course
 * because an offer with no recurring reason to remain is a course, not a
 * business.
 */
export interface InnerCircle {
  enabled: boolean;
  name: string;
  description: string;
  call: InnerCircleCall;
  /** What lives in the vault beyond the call — replays, templates, teardowns. */
  includes: string[];
}

export interface Positioning {
  pain_statement: string;
  mission_statement: string;
  army_statement: string;
}

/**
 * What the offer is worth, item by item.
 *
 * `stated_value` is null until the coach types a number. The engine never
 * invents a price: a figure the coach did not choose is a claim they would end
 * up making on a sales page without ever having decided it.
 */
export interface ValueStackItem {
  item: string;
  description: string;
  stated_value: number | null;
}

export interface BlueprintMeta {
  course_name: string;
  topic: string;
  audience: string;
  starting_pain: string;
  desired_result: string;
  coach_name: string;
  language: BlueprintLanguage;
  mode: BlueprintMode;
  created_at: string;
  version: number;
}

/**
 * The whole blueprint. This is the source of truth that is stored; every
 * output format — markdown, the on-screen editor, the published course — is a
 * pure render of it, so re-exporting never costs another model call.
 */
export interface CoursePayload {
  /** Mirrors the row id once saved; absent on a payload that is still in memory. */
  id?: string;
  meta: BlueprintMeta;
  /** What the coach uploaded to build this from. Absent when they typed it all. */
  source?: SourceMaterial;
  positioning: Positioning;
  steps: TransformationStep[];
  foundation: { days: FoundationDay[] };
  bonuses: Bonus[];
  live: {
    /**
     * Live classes are optional.
     *
     * A recorded-only programme is a real product — plenty of coaches sell the
     * three days and the bonuses and never run a call. When this is false the
     * sessions are not published, not exported, and not counted against step
     * coverage, rather than showing as twelve things the coach never agreed to.
     */
    included: boolean;
    /** "coach" when the sessions came from a plan they already had. */
    source: "generated" | "coach";
    sessions: LiveSession[];
  };
  inner_circle: InnerCircle;
  value_stack: ValueStackItem[];
}
