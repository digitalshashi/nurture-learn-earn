// One suggestion engine, three delivery modes.
//
// Every slot in the skeleton has a purpose that is already decided, and five
// inputs that say what this particular course is about. That is enough to
// compose a sentence that is genuinely about the coach's topic — not a
// placeholder, not lorem ipsum — with no model call at all.
//
// Which is why this file exists once and is used three ways:
//
//   formula → every suggestion accepted as-is, instantly and for free
//   manual  → shown beside the field with a "use this" button, coach decides
//   ai      → the fallback for any slot the model leaves empty or malformed
//
// Without it, manual mode would be fifteen blank textareas and AI mode would
// have nothing to fall back on when a generation half-fails.

import { BONUS_SLOTS, DEFAULT_BONUSES, FOUNDATION_DAYS, VALUE_STACK_ITEMS } from "./slots";
import type {
  Bonus,
  CourseInput,
  LiveSession,
  Positioning,
  TransformationStep,
  ValueStackItem,
} from "./types";

export interface SuggestionContext {
  input: CourseInput;
  steps: TransformationStep[];
}

export interface VideoSuggestion {
  title: string;
  covers: string;
  learner_actions: string[];
}

/** Trailing punctuation off, so a coach's input can sit mid-sentence. */
const phrase = (text: string) => text.trim().replace(/[.\s]+$/, "");

/**
 * Lowercased for use mid-sentence, unless the first word looks like a name or
 * an acronym — "SEO for beginners" must not become "sEO for beginners".
 */
const inline = (text: string) => {
  const trimmed = phrase(text);
  return /^[A-Z][a-z]/.test(trimmed) ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1) : trimmed;
};

/**
 * A step that may not exist yet.
 *
 * Manual mode renders suggestions while the coach is still editing the six
 * steps, so slot 2 of Day 2 can be asked for its text before step 1 has a
 * name. Returning a labelled placeholder keeps the editor usable instead of
 * printing "undefined" at the coach.
 */
const stepAt = (steps: TransformationStep[], number: number): TransformationStep =>
  steps.find((step) => step.number === number) ?? {
    number,
    name: `Step ${number}`,
    achievement: "",
  };

/** "Step 2 — Content Strategy", the way it is referred to everywhere. */
export const stepLabel = (step: TransformationStep) => `Step ${step.number} — ${step.name}`;

export function suggestCourseName(input: Pick<CourseInput, "topic" | "audience">): string {
  return `${phrase(input.topic)} — The 6-Step System for ${phrase(input.audience)}`;
}

/**
 * The teaching slots on Days 2 and 3 all read the same way, because they are
 * the same thing six times over: one step, taught with the tools to do it.
 */
function teachingSlot(ctx: SuggestionContext, stepNumber: number): VideoSuggestion {
  const step = stepAt(ctx.steps, stepNumber);
  const achievement = step.achievement ? ` By the end: ${inline(step.achievement)}.` : "";

  return {
    title: stepLabel(step),
    covers:
      `The full teaching for ${step.name}, with the tools and templates to do it rather than ` +
      `just understand it.${achievement}`,
    learner_actions: [`Use the ${step.name} template`, `Post your ${step.name} result in the comments`],
  };
}

type SlotBuilder = (ctx: SuggestionContext) => VideoSuggestion;

/**
 * A builder per foundation slot, keyed "day-slot".
 *
 * The keys mirror FOUNDATION_SLOTS exactly; foundationSlotKeys() below is what
 * the tests compare the two against, so a slot added to the skeleton without a
 * suggestion here fails the build rather than shipping an empty field.
 */
const FOUNDATION_SUGGESTIONS: Record<string, SlotBuilder> = {
  "1-1": ({ input }) => ({
    title: `Welcome — why ${phrase(input.topic)} matters right now`,
    covers:
      `Why ${inline(input.topic)} is worth the next three days of ${inline(input.audience)}'s time, ` +
      `what each day covers, and a straight word on who this is for: people who will actually do ` +
      `the work. Where the resource pack and the community live.`,
    learner_actions: [
      "Fill in the intake survey",
      "Join the community",
      "Download the resource pack",
    ],
  }),

  "1-2": ({ input, steps }) => ({
    title: `The 6 steps from ${inline(input.starting_pain)} to ${inline(input.desired_result)}`,
    covers:
      `All six steps walked through as one roadmap — ` +
      `${steps.map((step) => step.name).join(" → ")} — showing how each one feeds the next and ` +
      `why skipping a step breaks the result at the end.`,
    learner_actions: ["Take notes on all six steps", 'Comment "I am in" below'],
  }),

  "1-3": ({ input }) => ({
    title: "Where you stand today on all six steps",
    covers:
      `A short honest exercise that scores ${inline(input.audience)} against each of the six steps ` +
      `as things stand today, so the rest of the course is about their situation and not a general one.`,
    learner_actions: ["Complete the self-discovery worksheet", "Post your six scores in the comments"],
  }),

  "1-4": ({ input }) => ({
    title: "Your goal card, and the belief that has to go",
    covers:
      `Set one clear goal for ${inline(input.desired_result)}, build a Goal Card that stays visible ` +
      `daily, choose the daily ritual behind it, and name the belief that keeps ` +
      `${inline(input.audience)} stuck at ${inline(input.starting_pain)}.`,
    learner_actions: ["Create your Goal Card", "Commit to one daily ritual"],
  }),

  "1-5": ({ steps }) => ({
    title: "What Day 2 looks like",
    covers:
      `A preview of Day 2 — the skills this asks of you, then ${stepAt(steps, 1).name}, ` +
      `${stepAt(steps, 2).name} and ${stepAt(steps, 3).name} — plus the Code of Honour and how ` +
      `accountability works here.`,
    learner_actions: ["Post your accountability commitment"],
  }),

  "2-1": ({ input }) => ({
    title: `The skills ${inline(input.topic)} actually asks of you`,
    covers:
      `The core skills behind ${inline(input.topic)}, how to measure progress on each one instead ` +
      `of guessing, and the mental readiness the next two days need.`,
    learner_actions: ["Self-rate on each skill", "Note the weakest one"],
  }),

  "2-2": (ctx) => teachingSlot(ctx, 1),
  "2-3": (ctx) => teachingSlot(ctx, 2),
  "2-4": (ctx) => teachingSlot(ctx, 3),

  "2-5": ({ steps }) => ({
    title: "What Day 3 looks like",
    covers:
      `A preview of Day 3 — ${stepAt(steps, 4).name}, ${stepAt(steps, 5).name} and ` +
      `${stepAt(steps, 6).name}, then where all of this goes next. Guidelines repeated, and a ` +
      `request for an honest review from anyone the first two days have helped.`,
    learner_actions: ["Leave a review", "Post your Day 2 progress"],
  }),

  "3-1": (ctx) => teachingSlot(ctx, 4),
  "3-2": (ctx) => teachingSlot(ctx, 5),
  "3-3": (ctx) => teachingSlot(ctx, 6),

  "3-4": ({ input }) => ({
    title: "Where this goes in 3, 6 and 12 months",
    covers:
      `The mirror first — where ${inline(input.audience)} stands today, honestly. Then the path: ` +
      `what three months, six months and twelve months of doing this actually look like, told ` +
      `through the journeys of students who walked it.`,
    learner_actions: ["Write your own twelve-month picture"],
  }),

  "3-5": ({ input, steps }) => ({
    title: "Connect the dots — your next step",
    covers:
      `All six steps tied back into one journey, from ${inline(input.starting_pain)} to ` +
      `${inline(input.desired_result)}. What the live classes and the membership actually do for ` +
      `you that a recorded course cannot — ${stepAt(steps, 1).name} through ` +
      `${stepAt(steps, 6).name}, done with you rather than explained at you — and the one action ` +
      `to take now.`,
    learner_actions: ["Book your call", "Join the next level"],
  }),
};

/** Every "day-slot" key the suggestion table answers for. */
export const foundationSlotKeys = () => Object.keys(FOUNDATION_SUGGESTIONS);

/**
 * The suggested text for one foundation slot.
 *
 * Throws on an unknown slot rather than returning empty text: an unknown slot
 * means the skeleton and this table have drifted, and a silent blank field is
 * how that ships to a coach unnoticed.
 */
export function suggestFoundationVideo(
  ctx: SuggestionContext,
  day: number,
  slot: number,
): VideoSuggestion {
  const build = FOUNDATION_SUGGESTIONS[`${day}-${slot}`];
  if (!build) throw new Error(`No suggestion for foundation slot ${day}-${slot}`);
  return build(ctx);
}

export function suggestDayGoal(day: number): string {
  return FOUNDATION_DAYS.find((entry) => entry.day === day)?.goal ?? "";
}

/** One bonus, filled from its brief and the coach's topic. */
export function suggestBonus(ctx: SuggestionContext, number: number): Bonus {
  const brief = DEFAULT_BONUSES.find((entry) => entry.number === number);
  if (!brief) throw new Error(`No bonus brief numbered ${number}`);

  const topic = inline(ctx.input.topic);
  const covers: Record<string, string> = {
    context: `${brief.context.charAt(0).toUpperCase()}${brief.context.slice(1)}, in the context of ${topic}.`,
    content: `The main teaching: ${brief.content}. This is where the ${brief.resource.name} is handed over and filled in together.`,
    next: `Exactly what to do now — ${brief.next} — and how this ties back to the main six steps.`,
  };

  return {
    number: brief.number,
    topic: brief.topic,
    purpose: brief.purpose,
    videos: BONUS_SLOTS.map(({ slot }) => ({
      slot,
      title: `${brief.topic} — ${slot === "context" ? "why it matters" : slot === "content" ? brief.resource.name : "your next step"}`,
      covers: covers[slot],
    })),
    resource: { ...brief.resource },
  };
}

export function suggestBonuses(ctx: SuggestionContext): Bonus[] {
  return DEFAULT_BONUSES.map((brief) => suggestBonus(ctx, brief.number));
}

/**
 * Spreads a coach's existing day-by-day plan across the six steps.
 *
 * A coach who already runs an 11-day challenge does not want it rewritten;
 * they want it tagged. Days are dealt out in order so the mapping stays
 * monotonic — day 1 never builds a later step than day 2 — which is the only
 * property that makes the tags trustworthy to read.
 */
function tagExistingPlan(plan: string[]): LiveSession[] {
  return plan
    .map((line) => line.trim())
    .filter(Boolean)
    .map((title, index, all) => ({
      day: index + 1,
      step_ref: Math.min(6, Math.floor((index * 6) / all.length) + 1),
      title,
      taught: title,
      outcome: "One finished piece of work, done live.",
    }));
}

/**
 * Twelve sessions, two per step: build it, then fix and finish it.
 *
 * Two is the smallest number that lets a step be attempted and then corrected,
 * which is the whole reason the live classes exist — the recorded course
 * already explained it once.
 */
function generateSessions(steps: TransformationStep[]): LiveSession[] {
  return steps.flatMap((step, index) => [
    {
      day: index * 2 + 1,
      step_ref: step.number,
      title: `Build: ${step.name}`,
      taught: `Walking the ${step.name} template end to end, live, on your own work rather than an example.`,
      outcome: step.achievement || `A first version of ${step.name} finished in the session.`,
    },
    {
      day: index * 2 + 2,
      step_ref: step.number,
      title: `Fix and finish: ${step.name}`,
      taught: `Reviewing what you built, unsticking what stalled, and signing ${step.name} off before the next step starts.`,
      outcome: `${step.name} reviewed and closed, with nothing carried forward.`,
    },
  ]);
}

export function suggestLive(ctx: SuggestionContext): {
  source: "generated" | "coach";
  sessions: LiveSession[];
} {
  const plan = ctx.input.live_plan?.filter((line) => line.trim());
  if (plan?.length) return { source: "coach", sessions: tagExistingPlan(plan) };
  return { source: "generated", sessions: generateSessions(ctx.steps) };
}

export function suggestPositioning(ctx: SuggestionContext): Positioning {
  const { input } = ctx;
  return {
    pain_statement: `I do not want anyone else to go through ${inline(input.starting_pain)}.`,
    // The number is left as a bracket for the coach to fill. A mission is a
    // commitment they make, and the engine inventing "10,000 people" would put
    // a figure on a sales page that nobody ever decided.
    mission_statement: `My mission is to help [how many] ${inline(input.audience)} reach ${inline(input.desired_result)} through ${inline(input.topic)}.`,
    army_statement: `I want to create an army of ${inline(input.audience)} who have reached ${inline(input.desired_result)} and teach the next ones how.`,
  };
}

/**
 * The five rungs, described in the coach's own terms.
 *
 * Every `stated_value` stays null. Pricing is the coach's decision and a
 * suggested number would be read as a recommendation.
 */
export function suggestValueStack(ctx: SuggestionContext, sessionCount: number): ValueStackItem[] {
  const { input } = ctx;
  const descriptions: Record<(typeof VALUE_STACK_ITEMS)[number], string> = {
    Challenge: `The 3-day foundation course — 15 videos taking ${inline(input.audience)} from ${inline(input.starting_pain)} to believing the six steps work.`,
    Courses: `Six bonus courses — ${DEFAULT_BONUSES.map((bonus) => bonus.topic).join(", ")} — 18 short videos and 6 downloadable resources.`,
    Coaching: `${sessionCount} live implementation classes with ${phrase(input.coach_name)}, every one mapped to a transformation step.`,
    Community: `The peer group and accountability structure around ${inline(input.topic)}, where the work gets posted and checked.`,
    Certification: `A completion certificate for students who finish all six steps and submit the work.`,
  };

  return VALUE_STACK_ITEMS.map((item) => ({
    item,
    description: descriptions[item],
    stated_value: null,
  }));
}
