// Assembling a whole blueprint from the skeleton.
//
// The skeleton is owned here, not by whoever supplies the prose. Slots, slot
// purposes, day themes and step references are read from the frozen tables and
// written into the payload directly; a producer — the formula, the coach, or
// the model — only ever supplies title, covers and actions.
//
// That inversion is what makes the format hold. A model cannot rename a slot
// or map Day 2 video 3 to the wrong step, because it is never asked for those
// fields: they are stamped on afterwards from FOUNDATION_SLOTS.

import { deriveStepsFromTopic } from "./presets";
import {
  BONUS_SLOTS,
  DEFAULT_BONUSES,
  FOUNDATION_DAYS,
  FOUNDATION_SLOTS,
} from "./slots";
import {
  suggestBonuses,
  suggestCourseName,
  suggestFoundationVideo,
  suggestLive,
  suggestPositioning,
  suggestValueStack,
  type SuggestionContext,
} from "./suggest";
import type {
  Bonus,
  BlueprintMode,
  CourseInput,
  CoursePayload,
  FoundationDay,
  LiveSession,
  TransformationStep,
} from "./types";

export interface BuildOptions {
  mode: BlueprintMode;
  /**
   * `suggested` writes the formula's text into every slot. `blank` leaves the
   * text empty and keeps only the structure, which is what manual mode wants:
   * the coach writes, with the suggestion sitting beside the field rather than
   * already inside it, so accepting it is a decision they made.
   */
  fill?: "suggested" | "blank";
  createdAt?: string;
  version?: number;
}

const EMPTY_VIDEO = { title: "", covers: "", learner_actions: [] as string[] };

function buildFoundation(ctx: SuggestionContext, blank: boolean): { days: FoundationDay[] } {
  return {
    days: FOUNDATION_DAYS.map(({ day, theme, goal }) => ({
      day,
      theme,
      goal,
      videos: FOUNDATION_SLOTS[day].map((slot) => ({
        slot: slot.slot,
        slot_purpose: slot.purpose,
        step_ref: slot.step_ref,
        ...(blank ? { ...EMPTY_VIDEO } : suggestFoundationVideo(ctx, day, slot.slot)),
      })),
    })),
  };
}

function buildBonuses(ctx: SuggestionContext, blank: boolean): Bonus[] {
  if (!blank) return suggestBonuses(ctx);

  // Even blank, the topics and the resource names stay: they are the fixed
  // part of the bonus, and a coach staring at six untitled cards has lost the
  // structure that makes the bonuses worth having.
  return DEFAULT_BONUSES.map((brief) => ({
    number: brief.number,
    topic: brief.topic,
    purpose: brief.purpose,
    videos: BONUS_SLOTS.map(({ slot }) => ({ slot, title: "", covers: "" })),
    resource: { ...brief.resource },
  }));
}

/**
 * A complete, valid blueprint for these inputs and these six steps.
 *
 * Passing `fill: "blank"` still returns something that passes structural
 * validation — three days, five slots, six bonuses — because the structure is
 * never the coach's problem to get right. Only the writing is.
 */
export function buildPayload(
  input: CourseInput,
  steps: TransformationStep[],
  options: BuildOptions,
): CoursePayload {
  const ctx: SuggestionContext = { input, steps };
  const blank = options.fill === "blank";
  const live = suggestLive(ctx);

  return {
    meta: {
      course_name: suggestCourseName(input),
      topic: input.topic,
      audience: input.audience,
      starting_pain: input.starting_pain,
      desired_result: input.desired_result,
      coach_name: input.coach_name,
      language: input.language ?? "en",
      mode: options.mode,
      created_at: options.createdAt ?? new Date().toISOString(),
      version: options.version ?? 1,
    },
    positioning: blank
      ? { pain_statement: "", mission_statement: "", army_statement: "" }
      : suggestPositioning(ctx),
    steps,
    foundation: buildFoundation(ctx, blank),
    bonuses: buildBonuses(ctx, blank),
    // The live plan is kept even in blank mode when the coach supplied one —
    // they already wrote it, so asking them to type it again is not "manual",
    // it is rude.
    live: blank && live.source === "generated" ? { source: "generated", sessions: [] } : live,
    value_stack: blank
      ? []
      : suggestValueStack(ctx, live.sessions.length),
  };
}

/** Formula mode: every slot composed from the inputs, no model call, instantly. */
export function buildFormulaPayload(
  input: CourseInput,
  steps?: TransformationStep[],
): CoursePayload {
  return buildPayload(input, steps ?? deriveStepsFromTopic(input), {
    mode: "formula",
    fill: "suggested",
  });
}

/** Manual mode: the structure, the fixed labels, and nothing else written for them. */
export function buildManualPayload(
  input: CourseInput,
  steps?: TransformationStep[],
): CoursePayload {
  return buildPayload(input, steps ?? deriveStepsFromTopic(input), {
    mode: "manual",
    fill: "blank",
  });
}

// ------------------------------------------------------------ AI merging ---

/** What the model is asked for. Deliberately narrower than the payload. */
export interface GeneratedFoundation {
  days?: {
    day?: number;
    videos?: { slot?: number; title?: string; covers?: string; learner_actions?: string[] }[];
  }[];
}

export interface GeneratedBonuses {
  bonuses?: {
    number?: number;
    purpose?: string;
    videos?: { slot?: string; title?: string; covers?: string }[];
  }[];
}

export interface GeneratedLive {
  sessions?: {
    day?: number;
    step_ref?: number;
    title?: string;
    taught?: string;
    outcome?: string;
  }[];
}

const usable = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Folds a model's prose into the skeleton.
 *
 * Precedence is: what the model returned, then what is already written, then
 * the formula. The middle term matters more than it looks. Partial output is
 * the normal failure — a day comes back empty, or the coach regenerated only
 * the bonuses — and without it, every slot the model did not answer for would
 * be reset to formula text, silently discarding whatever the coach had
 * written there.
 *
 * The result is that a half-failed generation is a complete course with a few
 * weaker paragraphs, rather than nine videos and an apology.
 */
export function applyGeneratedFoundation(
  payload: CoursePayload,
  generated: GeneratedFoundation | null | undefined,
): CoursePayload {
  const ctx: SuggestionContext = { input: toInput(payload), steps: payload.steps };

  return {
    ...payload,
    foundation: {
      days: payload.foundation.days.map((day) => {
        const source = generated?.days?.find((candidate) => candidate.day === day.day);
        return {
          ...day,
          videos: day.videos.map((video) => {
            const match = source?.videos?.find((candidate) => candidate.slot === video.slot);
            const fallback = suggestFoundationVideo(ctx, day.day, video.slot);
            const actions = match?.learner_actions?.filter(usable) ?? [];
            const pick = (fromModel: string | undefined, existing: string, formula: string) =>
              usable(fromModel) ? fromModel.trim() : existing.trim() || formula;

            return {
              // Stamped from the frozen table, never from the model.
              slot: video.slot,
              slot_purpose: video.slot_purpose,
              step_ref: video.step_ref,
              title: pick(match?.title, video.title, fallback.title),
              covers: pick(match?.covers, video.covers, fallback.covers),
              learner_actions: actions.length
                ? actions
                : video.learner_actions.length
                  ? video.learner_actions
                  : fallback.learner_actions,
            };
          }),
        };
      }),
    },
  };
}

export function applyGeneratedBonuses(
  payload: CoursePayload,
  generated: GeneratedBonuses | null | undefined,
): CoursePayload {
  const ctx: SuggestionContext = { input: toInput(payload), steps: payload.steps };
  const fallbacks = suggestBonuses(ctx);

  return {
    ...payload,
    bonuses: payload.bonuses.map((bonus) => {
      const source = generated?.bonuses?.find((candidate) => candidate.number === bonus.number);
      const fallback = fallbacks.find((entry) => entry.number === bonus.number)!;
      const pick = (fromModel: string | undefined, existing: string, formula: string) =>
        usable(fromModel) ? fromModel.trim() : existing.trim() || formula;

      return {
        ...bonus,
        purpose: pick(source?.purpose, bonus.purpose, fallback.purpose),
        videos: bonus.videos.map((video) => {
          const match = source?.videos?.find((candidate) => candidate.slot === video.slot);
          const fallbackVideo = fallback.videos.find((entry) => entry.slot === video.slot)!;
          return {
            slot: video.slot,
            title: pick(match?.title, video.title, fallbackVideo.title),
            covers: pick(match?.covers, video.covers, fallbackVideo.covers),
          };
        }),
      };
    }),
  };
}

/**
 * Live sessions from the model, with the invalid ones dropped and the whole
 * set replaced by the formula's if nothing survives or a step ends up with no
 * session at all — an uncovered step is the one live-plan defect a coach will
 * not notice until a student asks about it mid-programme.
 */
export function applyGeneratedLive(
  payload: CoursePayload,
  generated: GeneratedLive | null | undefined,
): CoursePayload {
  // A coach's own plan is never overwritten by a generation.
  if (payload.live.source === "coach" && payload.live.sessions.length) return payload;

  const ctx: SuggestionContext = { input: toInput(payload), steps: payload.steps };

  // Nothing came back at all — because this section was not part of the run,
  // or because the call failed. Keep what is there; only reach for the formula
  // when there is nothing to keep.
  if (!generated?.sessions?.length) {
    return payload.live.sessions.length ? payload : { ...payload, live: suggestLive(ctx) };
  }

  const cleaned: LiveSession[] = (generated?.sessions ?? [])
    .filter(
      (session) =>
        usable(session.title) &&
        typeof session.step_ref === "number" &&
        session.step_ref >= 1 &&
        session.step_ref <= 6,
    )
    .map((session, index) => ({
      day: typeof session.day === "number" && session.day > 0 ? session.day : index + 1,
      step_ref: session.step_ref as number,
      title: session.title!.trim(),
      taught: usable(session.taught) ? session.taught.trim() : session.title!.trim(),
      outcome: usable(session.outcome) ? session.outcome.trim() : "One finished piece of work.",
    }))
    .sort((a, b) => a.day - b.day);

  const covered = new Set(cleaned.map((session) => session.step_ref));
  if (cleaned.length < 6 || covered.size < 6) return { ...payload, live: suggestLive(ctx) };

  return { ...payload, live: { source: "generated", sessions: cleaned } };
}

/** The five inputs back out of a stored payload, for re-running suggestions. */
export function toInput(payload: CoursePayload): CourseInput {
  return {
    topic: payload.meta.topic,
    audience: payload.meta.audience,
    starting_pain: payload.meta.starting_pain,
    desired_result: payload.meta.desired_result,
    coach_name: payload.meta.coach_name,
    language: payload.meta.language,
    ...(payload.live.source === "coach"
      ? { live_plan: payload.live.sessions.map((session) => session.title) }
      : {}),
  };
}

/**
 * Rebuilds the value stack and positioning after the steps or the live plan
 * changed, without touching anything the coach has written into a slot.
 */
export function refreshDerived(payload: CoursePayload): CoursePayload {
  const ctx: SuggestionContext = { input: toInput(payload), steps: payload.steps };
  const stack = suggestValueStack(ctx, payload.live.sessions.length);

  return {
    ...payload,
    value_stack: payload.value_stack.length
      ? // Coach-entered prices survive; only the descriptions are refreshed.
        stack.map((item) => ({
          ...item,
          stated_value:
            payload.value_stack.find((existing) => existing.item === item.item)?.stated_value ??
            null,
        }))
      : stack,
  };
}
