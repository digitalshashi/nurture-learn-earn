// The business rules, enforced in code rather than in a prompt.
//
// A prompt that says "exactly six steps" is a request. This file is the check.
// It runs against all three modes for the same reason: a coach editing by hand
// can delete a bonus just as easily as a model can forget one, and the publish
// step downstream assumes the shape holds.
//
// Structural breakages are errors — the format is broken and the retry should
// say so. Empty fields and suspicious prose are warnings: the blueprint is
// valid, it is just not finished or not safe to put in front of buyers yet.

import { BONUS_COUNT, FOUNDATION_DAY_COUNT, FOUNDATION_SLOTS, FOUNDATION_VIDEO_COUNT, STEP_COUNT } from "./slots";
import type { CoursePayload } from "./types";

export type Severity = "error" | "warning";

export interface Violation {
  /** Stable id, so a retry prompt can name the rule that failed. */
  rule: string;
  /** Where in the payload, in dot notation, for the editor to jump to. */
  path: string;
  message: string;
  severity: Severity;
}

/**
 * Words in a step name, ignoring connectors that carry no meaning.
 *
 * "Niche & Profile Setup" is three words, not four: the ampersand is
 * punctuation. Counting it would push perfectly good names over the limit and
 * send the generator into a retry loop over a typographic detail.
 */
export function wordCount(name: string): number {
  return name
    .trim()
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

const err = (rule: string, path: string, message: string): Violation => ({
  rule,
  path,
  message,
  severity: "error",
});

const warn = (rule: string, path: string, message: string): Violation => ({
  rule,
  path,
  message,
  severity: "warning",
});

/** The A5 rules. Everything here means the skeleton itself is wrong. */
export function validateStructure(payload: CoursePayload): Violation[] {
  const out: Violation[] = [];

  // ------------------------------------------------------------- steps ---
  if (payload.steps.length !== STEP_COUNT) {
    out.push(err("steps.count", "steps", `Expected exactly ${STEP_COUNT} steps, found ${payload.steps.length}.`));
  }

  const numbers = new Set(payload.steps.map((step) => step.number));
  const expected = Array.from({ length: STEP_COUNT }, (_, i) => i + 1);
  if (numbers.size !== payload.steps.length || !expected.every((n) => numbers.has(n))) {
    out.push(err("steps.numbering", "steps", "Steps must be numbered 1 to 6, each exactly once."));
  }

  payload.steps.forEach((step, index) => {
    const words = wordCount(step.name);
    if (words < 2 || words > 4) {
      out.push(
        err(
          "steps.name_length",
          `steps.${index}.name`,
          `"${step.name}" is ${words} word${words === 1 ? "" : "s"}; step names must be 2 to 4 plain words.`,
        ),
      );
    }
  });

  // -------------------------------------------------------- foundation ---
  if (payload.foundation.days.length !== FOUNDATION_DAY_COUNT) {
    out.push(
      err(
        "foundation.day_count",
        "foundation.days",
        `Expected ${FOUNDATION_DAY_COUNT} days, found ${payload.foundation.days.length}.`,
      ),
    );
  }

  payload.foundation.days.forEach((day, dayIndex) => {
    const frozen = FOUNDATION_SLOTS[day.day];
    const path = `foundation.days.${dayIndex}`;

    if (!frozen) {
      out.push(err("foundation.unknown_day", path, `Day ${day.day} is not part of the format.`));
      return;
    }

    if (day.videos.length !== FOUNDATION_VIDEO_COUNT) {
      out.push(
        err(
          "foundation.video_count",
          `${path}.videos`,
          `Day ${day.day} has ${day.videos.length} videos; every day has exactly ${FOUNDATION_VIDEO_COUNT}.`,
        ),
      );
    }

    frozen.forEach((slot, slotIndex) => {
      const video = day.videos.find((candidate) => candidate.slot === slot.slot);
      const videoPath = `${path}.videos.${slotIndex}`;

      if (!video) {
        out.push(err("foundation.missing_slot", videoPath, `Day ${day.day} slot ${slot.slot} is missing.`));
        return;
      }

      // The running order is the format. A renamed slot means the video is no
      // longer doing the job the day depends on it doing.
      if (video.slot_purpose !== slot.purpose) {
        out.push(
          err(
            "foundation.slot_purpose",
            `${videoPath}.slot_purpose`,
            `Day ${day.day} slot ${slot.slot} should be "${slot.purpose}", found "${video.slot_purpose}".`,
          ),
        );
      }

      // Day 2 teaches steps 1-3 and Day 3 teaches steps 4-6. Getting this
      // wrong is the classic generation failure: the prose drifts and Day 2
      // starts teaching step 4 while the steps table still says otherwise.
      if (video.step_ref !== slot.step_ref) {
        out.push(
          err(
            "foundation.step_ref",
            `${videoPath}.step_ref`,
            `Day ${day.day} slot ${slot.slot} must map to ${slot.step_ref === null ? "no step" : `step ${slot.step_ref}`}.`,
          ),
        );
      }
    });
  });

  // ----------------------------------------------------------- bonuses ---
  if (payload.bonuses.length !== BONUS_COUNT) {
    out.push(err("bonuses.count", "bonuses", `Expected ${BONUS_COUNT} bonuses, found ${payload.bonuses.length}.`));
  }

  payload.bonuses.forEach((bonus, index) => {
    if (bonus.videos.length !== 3) {
      out.push(
        err("bonuses.video_count", `bonuses.${index}.videos`, `Bonus ${bonus.number} has ${bonus.videos.length} videos; every bonus has exactly 3.`),
      );
    }
    const slots = bonus.videos.map((video) => video.slot);
    if (new Set(slots).size !== slots.length || !["context", "content", "next"].every((slot) => slots.includes(slot as never))) {
      out.push(
        err("bonuses.video_slots", `bonuses.${index}.videos`, `Bonus ${bonus.number} must have one context, one content and one next-steps video.`),
      );
    }
    if (!bonus.resource?.name?.trim()) {
      out.push(err("bonuses.resource", `bonuses.${index}.resource`, `Bonus ${bonus.number} has no downloadable resource.`));
    }
  });

  // -------------------------------------------------------------- live ---
  payload.live.sessions.forEach((session, index) => {
    if (!Number.isInteger(session.step_ref) || session.step_ref < 1 || session.step_ref > STEP_COUNT) {
      out.push(
        err("live.step_ref", `live.sessions.${index}.step_ref`, `Session "${session.title}" is tagged to step ${session.step_ref}, which does not exist.`),
      );
    }
  });

  return out;
}

/** How many live sessions build each step. A zero here is the warning worth seeing. */
export function stepCoverage(payload: CoursePayload): Map<number, number> {
  const counts = new Map<number, number>(payload.steps.map((step) => [step.number, 0]));
  for (const session of payload.live.sessions) {
    if (counts.has(session.step_ref)) counts.set(session.step_ref, counts.get(session.step_ref)! + 1);
  }
  return counts;
}

/** Steps with no live session attached, in order. */
export function uncoveredSteps(payload: CoursePayload): number[] {
  return [...stepCoverage(payload).entries()]
    .filter(([, count]) => count === 0)
    .map(([step]) => step)
    .sort((a, b) => a - b);
}

/**
 * Prose that makes a claim nobody verified.
 *
 * Percentages, prices and quoted students are what a generator reaches for
 * when it wants a paragraph to sound persuasive, and they end up on a sales
 * page as statements the coach never made. Flagged rather than blocked — a
 * coach teaching personal finance has every right to write "%".
 */
export function scanForFabrication(payload: CoursePayload): Violation[] {
  const patterns: { rule: string; test: RegExp; message: string }[] = [
    { rule: "claims.percentage", test: /\d\s*%/, message: "Contains a percentage figure. Check it is a number you can stand behind." },
    { rule: "claims.currency", test: /[₹$€£]\s*\d/, message: "Contains a price or an earnings figure. Check it is a number you can stand behind." },
    { rule: "claims.testimonial", test: /\b(students?|clients?|members?)\s+(said|say|report(ed)?|earned|made)\b/i, message: "Reads like a testimonial. Only keep it if a real student said it." },
    { rule: "claims.guarantee", test: /\bguarantee(d|s)?\b/i, message: "Promises a guarantee. Only keep it if you will honour it." },
    { rule: "claims.multiple", test: /\b\d+\s*x\b/i, message: "Contains a multiplier claim. Check it is a number you can stand behind." },
  ];

  const out: Violation[] = [];

  for (const { path, text } of prose(payload)) {
    for (const { rule, test, message } of patterns) {
      if (test.test(text)) out.push(warn(rule, path, message));
    }
  }

  return out;
}

/** Slots the coach still has to write. What "not finished" means, concretely. */
export function findBlanks(payload: CoursePayload): Violation[] {
  const out: Violation[] = [];

  payload.foundation.days.forEach((day, dayIndex) => {
    day.videos.forEach((video, videoIndex) => {
      const path = `foundation.days.${dayIndex}.videos.${videoIndex}`;
      if (!video.title.trim()) out.push(warn("blank.title", `${path}.title`, `Day ${day.day} video ${video.slot} has no title.`));
      if (!video.covers.trim()) out.push(warn("blank.covers", `${path}.covers`, `Day ${day.day} video ${video.slot} has nothing written for what it covers.`));
    });
  });

  payload.bonuses.forEach((bonus, index) => {
    bonus.videos.forEach((video, videoIndex) => {
      if (!video.title.trim()) {
        out.push(warn("blank.bonus_title", `bonuses.${index}.videos.${videoIndex}.title`, `Bonus ${bonus.number} ${video.slot} video has no title.`));
      }
    });
  });

  if (!payload.live.sessions.length) {
    out.push(warn("blank.live", "live.sessions", "No live sessions planned yet."));
  }

  for (const step of uncoveredSteps(payload)) {
    const name = payload.steps.find((entry) => entry.number === step)?.name ?? `Step ${step}`;
    out.push(warn("live.uncovered_step", "live.sessions", `No live session builds ${name}.`));
  }

  return out;
}

export function validatePayload(payload: CoursePayload): Violation[] {
  return [...validateStructure(payload), ...findBlanks(payload), ...scanForFabrication(payload)];
}

/** True when nothing structural is broken — the gate a generation retry uses. */
export function isStructurallyValid(payload: CoursePayload): boolean {
  return validateStructure(payload).length === 0;
}

/** True when it is also finished: no empty slot, every step covered. */
export function isPublishable(payload: CoursePayload): boolean {
  return isStructurallyValid(payload) && findBlanks(payload).length === 0;
}

/** Every piece of generated prose, with the path it came from. */
function prose(payload: CoursePayload): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];

  payload.foundation.days.forEach((day, dayIndex) => {
    day.videos.forEach((video, videoIndex) => {
      const path = `foundation.days.${dayIndex}.videos.${videoIndex}`;
      out.push({ path: `${path}.title`, text: video.title });
      out.push({ path: `${path}.covers`, text: video.covers });
    });
  });

  payload.bonuses.forEach((bonus, index) => {
    out.push({ path: `bonuses.${index}.purpose`, text: bonus.purpose });
    bonus.videos.forEach((video, videoIndex) => {
      out.push({ path: `bonuses.${index}.videos.${videoIndex}.covers`, text: video.covers });
    });
  });

  payload.live.sessions.forEach((session, index) => {
    out.push({ path: `live.sessions.${index}.taught`, text: session.taught });
    out.push({ path: `live.sessions.${index}.outcome`, text: session.outcome });
  });

  out.push({ path: "positioning.mission_statement", text: payload.positioning.mission_statement });
  out.push({ path: "positioning.army_statement", text: payload.positioning.army_statement });

  return out.filter((entry) => Boolean(entry.text));
}
