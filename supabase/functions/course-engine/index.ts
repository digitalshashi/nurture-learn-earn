// The AI half of the course engine.
//
// Only the prose is generated here. The skeleton — which slots exist, what
// each is for, which step each teaches — is owned by the app and stamped onto
// the payload after this returns, so a model that ignores the slot table
// cannot corrupt the structure. That is why this function returns loose parts
// rather than a whole payload.
//
// Three actions:
//   derive_steps   — stage 1, the one creative call, validated and retried
//   generate_parts — stage 3, five calls in parallel, each retried on its own
//   suggest_slot   — one slot, for a coach writing by hand who wants an angle
//
// Anything that fails twice comes back as a warning rather than an error. The
// app fills that section from the formula, so a half-failed generation is a
// complete course with a few weaker paragraphs — not an apology and a spinner.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireUser } from "../_shared/edge.ts";
import {
  AiError,
  generateLongText,
  resolveModel,
  type ResolvedModel,
} from "../_shared/aiClient.ts";
import { parseModelJson, strictParseJson } from "../_shared/jsonReply.ts";
import { checkSteps, DEFAULT_BONUSES, FOUNDATION_SLOTS, type Step } from "../_shared/courseSkeleton.ts";
import {
  bonusesPrompt,
  foundationDayPrompt,
  livePrompt,
  PARTS_SYSTEM,
  slotPrompt,
  stepsPrompt,
  STEPS_SYSTEM,
  type EngineInput,
  type SlotTarget,
} from "./prompts.ts";

interface Attempt<T> {
  value: T | null;
  tokens: number;
  /** Why it was given up on, for the coach to read. */
  warning?: string;
}

/**
 * Runs a generation, checks it, and retries once with the specific complaint
 * appended.
 *
 * Telling the model "Previous attempt failed: step 3 was named with one word"
 * fixes it far more often than asking again in the same words. Two attempts,
 * then give up — a third rarely helps and the coach is waiting.
 */
async function withRetry<T>(
  label: string,
  run: (note?: string) => Promise<{ value: T; tokens: number }>,
  check: (value: T) => string[],
  attempts = 2,
): Promise<Attempt<T>> {
  let note: string | undefined;
  let tokens = 0;
  let lastProblem = "";

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await run(note);
      tokens += result.tokens;

      const problems = check(result.value);
      if (problems.length === 0) return { value: result.value, tokens };

      lastProblem = problems.join(" ");
      note = `Your previous attempt failed validation: ${lastProblem} Fix exactly this and return the full JSON again.`;
    } catch (e) {
      lastProblem = e instanceof Error ? e.message : String(e);
      note = `Your previous attempt could not be read: ${lastProblem} Return only valid JSON.`;
    }
  }

  return { value: null, tokens, warning: `${label} could not be generated (${lastProblem}).` };
}

/**
 * A floor on the reply budget for one call.
 *
 * ai_settings.max_tokens is a single global default, and it is usually tuned
 * for the short copy the rest of the app generates — a subject line, a caption.
 * These calls return structured JSON holding five videos or six bonuses, and a
 * budget that runs out halfway does not produce a shorter answer: it produces a
 * reply cut mid-array, which is unparseable. The coach's own setting still wins
 * whenever it is the larger of the two.
 */
const withBudget = (resolved: ResolvedModel, floor: number): ResolvedModel => ({
  ...resolved,
  maxTokens: Math.max(resolved.maxTokens, floor),
});

/**
 * One structured request, continued if the provider stops for room.
 *
 * generateLongText hands the partial text back to be resumed rather than
 * restarted, and `isComplete` stops it the moment the accumulated reply parses
 * on its own — so a reply that fitted the first time costs exactly one call.
 * The check has to be the strict parser: treating a truncated reply as
 * finished is how a course ends up with four bonuses and nobody noticing.
 */
async function ask<T>(
  resolved: ResolvedModel,
  system: string,
  prompt: string,
  label: string,
  accepts: (value: unknown) => boolean,
): Promise<{ value: T; tokens: number }> {
  const result = await generateLongText(resolved, {
    system,
    prompt,
    json: true,
    isComplete: (text) => strictParseJson(text, accepts) !== null,
    maxRounds: 3,
  });

  return { value: parseModelJson<T>(result.text, label, accepts), tokens: result.tokensUsed };
}

/**
 * What each reply has to look like to count as the whole answer.
 *
 * Not a substitute for the checks below — these only say "this is the right
 * kind of object", so the parser can tell a finished reply from one array
 * element of a cut-off one. Whether the contents are any good is decided by
 * checkDay, checkBonuses and the rest.
 */
const hasArray = (key: string) => (value: unknown) =>
  Array.isArray((value as Record<string, unknown>)?.[key]);

const nonEmpty = (value: unknown) => typeof value === "string" && value.trim().length > 0;

// ------------------------------------------------------------- checks -----

interface DayReply {
  videos?: { slot?: number; title?: string; covers?: string; learner_actions?: string[] }[];
}

/** A day is acceptable when all five slots came back with something written. */
function checkDay(day: number) {
  return (reply: DayReply): string[] => {
    const problems: string[] = [];
    for (const slot of FOUNDATION_SLOTS[day]) {
      const video = reply.videos?.find((candidate) => candidate.slot === slot.slot);
      if (!video) {
        problems.push(`Slot ${slot.slot} (${slot.purpose}) is missing.`);
        continue;
      }
      if (!nonEmpty(video.title)) problems.push(`Slot ${slot.slot} has no title.`);
      if (!nonEmpty(video.covers)) problems.push(`Slot ${slot.slot} has nothing for what it covers.`);
    }
    return problems;
  };
}

interface BonusesReply {
  bonuses?: { number?: number; purpose?: string; videos?: { slot?: string; title?: string; covers?: string }[] }[];
}

function checkBonuses(reply: BonusesReply): string[] {
  const problems: string[] = [];

  for (const brief of DEFAULT_BONUSES) {
    const bonus = reply.bonuses?.find((candidate) => candidate.number === brief.number);
    if (!bonus) {
      problems.push(`Bonus ${brief.number} (${brief.topic}) is missing.`);
      continue;
    }
    for (const slot of ["context", "content", "next"]) {
      const video = bonus.videos?.find((candidate) => candidate.slot === slot);
      if (!video || !nonEmpty(video.title)) {
        problems.push(`Bonus ${brief.number} is missing its "${slot}" video.`);
      }
    }
  }

  return problems;
}

interface LiveReply {
  sessions?: { day?: number; step_ref?: number; title?: string; taught?: string; outcome?: string }[];
}

function checkLive(reply: LiveReply): string[] {
  const sessions = reply.sessions ?? [];
  const problems: string[] = [];

  if (sessions.length < 6) problems.push(`Only ${sessions.length} sessions; at least 6 are required.`);
  if (sessions.length > 12) problems.push(`${sessions.length} sessions; 12 is the maximum.`);

  const covered = new Set(sessions.map((session) => session.step_ref));
  const missing = [1, 2, 3, 4, 5, 6].filter((step) => !covered.has(step));
  // The one live-plan defect a coach does not notice until a student asks
  // about it halfway through the programme.
  if (missing.length) problems.push(`No session builds step${missing.length > 1 ? "s" : ""} ${missing.join(", ")}.`);

  for (const session of sessions) {
    if (!nonEmpty(session.title)) problems.push("A session has no title.");
    if (!nonEmpty(session.outcome)) problems.push(`Session "${session.title}" has no finished outcome.`);
  }

  return problems;
}

// ------------------------------------------------------------ handler -----

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const action = body?.action as string;
    const input = body?.input as EngineInput;

    if (!input?.topic?.trim()) return json({ error: "A topic is required." }, 400);

    const resolved = await resolveModel(userId, "text");

    // ------------------------------------------------- stage 1: steps ---
    if (action === "derive_steps") {
      const attempt = await withRetry<{ steps?: Step[] }>(
        "The six steps",
        (note) => ask(withBudget(resolved, 2000), STEPS_SYSTEM, stepsPrompt(input, note), "The six steps", hasArray("steps")),
        (reply) => checkSteps(reply.steps ?? []),
      );

      if (!attempt.value?.steps) {
        // Surfaced rather than papered over: the coach picks the steps by hand
        // or from a preset, which is a better outcome than six wrong steps
        // that the entire rest of the course is then built on.
        return json({ error: attempt.warning ?? "Could not derive the six steps." }, 422);
      }

      return json({
        steps: attempt.value.steps,
        tokens_used: attempt.tokens,
        model: resolved.model,
        provider: resolved.credential.provider,
      });
    }

    // ------------------------------------------------- stage 3: parts ---
    if (action === "generate_parts") {
      const steps = (body?.steps ?? []) as Step[];
      const stepProblems = checkSteps(steps);
      if (stepProblems.length) {
        return json({ error: `Approve six valid steps first: ${stepProblems.join(" ")}` }, 400);
      }

      // A coach who dislikes the bonuses should not have to pay for — or risk
      // losing — a foundation they have already edited. `sections` narrows the
      // run to what they asked for; omitted, it generates everything.
      const requested: string[] = Array.isArray(body?.sections) && body.sections.length
        ? (body.sections as string[])
        : ["day1", "day2", "day3", "bonuses", "live"];
      const wanted = (section: string) => requested.includes(section);

      const skipped = <T,>(): Attempt<T> => ({ value: null, tokens: 0 });

      // Independent calls, so they run together. In sequence this would be a
      // ninety-second wait for no reason: they share nothing but the steps.
      const [day1, day2, day3, bonuses, live] = await Promise.all([
        wanted("day1")
          ? withRetry<DayReply>(
              "Day 1",
              (note) =>
                ask(withBudget(resolved, 3000), PARTS_SYSTEM, foundationDayPrompt(input, steps, 1, note), "Day 1", hasArray("videos")),
              checkDay(1),
            )
          : skipped<DayReply>(),
        wanted("day2")
          ? withRetry<DayReply>(
              "Day 2",
              (note) =>
                ask(withBudget(resolved, 3000), PARTS_SYSTEM, foundationDayPrompt(input, steps, 2, note), "Day 2", hasArray("videos")),
              checkDay(2),
            )
          : skipped<DayReply>(),
        wanted("day3")
          ? withRetry<DayReply>(
              "Day 3",
              (note) =>
                ask(withBudget(resolved, 3000), PARTS_SYSTEM, foundationDayPrompt(input, steps, 3, note), "Day 3", hasArray("videos")),
              checkDay(3),
            )
          : skipped<DayReply>(),
        wanted("bonuses")
          ? withRetry<BonusesReply>(
              "The bonuses",
              (note) =>
                ask(withBudget(resolved, 4000), PARTS_SYSTEM, bonusesPrompt(input, steps, note), "The bonuses", hasArray("bonuses")),
              checkBonuses,
            )
          : skipped<BonusesReply>(),
        wanted("live")
          ? withRetry<LiveReply>(
              "The live classes",
              (note) =>
                ask(withBudget(resolved, 3000), PARTS_SYSTEM, livePrompt(input, steps, note), "The live classes", hasArray("sessions")),
              checkLive,
            )
          : skipped<LiveReply>(),
      ]);

      const parts = [day1, day2, day3, bonuses, live];
      const warnings = parts.map((part) => part.warning).filter(Boolean) as string[];

      // Every requested call failing means the provider is not working, not
      // that the prose was weak. Say so, rather than handing back a formula
      // course the coach spent AI credits on.
      if (warnings.length === requested.length) {
        return json({ error: warnings[0] ?? "Generation failed." }, 502);
      }

      return json({
        // Only the sections that were asked for come back. The app leaves
        // everything else exactly as the coach left it.
        sections: requested,
        foundation: {
          days: [
            ...(wanted("day1") ? [{ day: 1, videos: day1.value?.videos ?? [] }] : []),
            ...(wanted("day2") ? [{ day: 2, videos: day2.value?.videos ?? [] }] : []),
            ...(wanted("day3") ? [{ day: 3, videos: day3.value?.videos ?? [] }] : []),
          ],
        },
        bonuses: bonuses.value?.bonuses ?? [],
        live: { sessions: live.value?.sessions ?? [] },
        warnings,
        tokens_used: parts.reduce((total, part) => total + part.tokens, 0),
        model: resolved.model,
        provider: resolved.credential.provider,
      });
    }

    // -------------------------------------------------- one slot only ---
    if (action === "suggest_slot") {
      const steps = (body?.steps ?? []) as Step[];
      const target = body?.target as SlotTarget;
      if (!target?.kind) return json({ error: "Which slot?" }, 400);

      const { value: reply, tokens } = await ask<{
        title?: string;
        covers?: string;
        learner_actions?: string[];
      }>(
        withBudget(resolved, 1200),
        PARTS_SYSTEM,
        slotPrompt(input, steps, target, body?.existing),
        "The suggestion",
        (value) => typeof (value as { title?: unknown })?.title === "string",
      );

      return json({
        suggestion: {
          title: reply.title ?? "",
          covers: reply.covers ?? "",
          learner_actions: (reply.learner_actions ?? []).filter(nonEmpty),
        },
        tokens_used: tokens,
        model: resolved.model,
        provider: resolved.credential.provider,
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    console.error("course-engine error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
