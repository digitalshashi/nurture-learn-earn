// Getting JSON out of a model reply that is not quite JSON.
//
// parseJsonReply in aiClient.ts takes the text between the first "{" and the
// last "}". That is right often enough to look fine and wrong in the two ways
// that actually happen:
//
//   1. Trailing prose. "…} Hope this helps! {see above}" — the last brace
//      belongs to the commentary, so the slice spans both and parses as
//      nothing.
//   2. A truncated reply. The model runs out of room mid-array, so the last
//      "}" is the one closing the *previous* element, and the slice ends up as
//      `{ "steps": [ {...}, {...} }` — an array closed by a brace. That is
//      exactly the "Expected ',' or ']' after array element" failure.
//
// Both are fixed by scanning instead of slicing: walk the text tracking string
// state and bracket depth, and take the span that actually balances. When
// nothing balances, the reply was cut off, and the last complete element is
// still worth keeping — five good steps that fail validation with "only 5
// steps" beat a parse error, because the retry can then say something useful.

/**
 * Where a complete element ended, and what was still open at that point.
 *
 * Only recorded when a container closes, never at a comma. Every shape this
 * engine asks for is an array of objects, so a closed container is exactly one
 * finished element — whereas a comma can also fall between two keys of a
 * half-written object, and salvaging `{"number": 6}` with no name attached
 * gains nothing over dropping it.
 */
interface SafePoint {
  end: number;
  /** Closing characters still owed, outermost first. */
  stack: string[];
}

interface Scan {
  /** Index of the first "{" or "[", or -1 if the reply has no JSON in it. */
  start: number;
  /** Index just past the matching close, or null if it never balanced. */
  complete: number | null;
  safe: SafePoint[];
}

/**
 * Walks the text once, tracking quotes, escapes and bracket depth.
 *
 * String awareness is the whole point: a brace inside "what it covers" text is
 * not structure, and counting it is how naive scanners lose the plot.
 */
function scan(text: string): Scan {
  const stack: string[] = [];
  const safe: SafePoint[] = [];
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      if (start === -1) start = i;
      stack.push(char === "{" ? "}" : "]");
      continue;
    }

    if (char === "}" || char === "]") {
      // A close that does not match what is open means the reply is malformed
      // rather than merely unfinished. Stop and keep what is safe so far.
      if (!stack.length || stack[stack.length - 1] !== char) break;
      stack.pop();
      if (start === -1) continue;
      if (stack.length === 0) return { start, complete: i + 1, safe };
      safe.push({ end: i + 1, stack: [...stack] });
    }
  }

  return { start, complete: null, safe };
}

/** Markdown fences, which several providers add despite being told not to. */
const unfence = (text: string) => text.replace(/```(?:json)?/gi, "").trim();

/**
 * The first balanced JSON value in the text, ignoring anything around it.
 * Null when the reply contains none, or was cut off before it closed.
 */
export function extractJson(text: string): string | null {
  const source = unfence(text);
  const { start, complete } = scan(source);
  if (start === -1 || complete === null) return null;
  return source.slice(start, complete);
}

/** Openers examined before giving up, so a pathological reply cannot hang us. */
const MAX_CANDIDATE_STARTS = 2000;

/**
 * Every balanced JSON value in the text, in the order they start.
 *
 * More than one is not a hypothetical. When a reply is continued, some
 * providers resume mid-sentence as asked, but others start again from the top
 * — and OpenAI-style JSON mode all but forces a restart, because it will only
 * emit a whole object. The accumulated text is then a truncated fragment
 * followed by a complete answer, and taking the first balanced span finds
 * neither.
 *
 * Each opener is scanned with fresh string state rather than carrying state
 * forward, which matters precisely in that case: a reply cut off mid-string
 * leaves an unterminated quote, and any scan that inherits it treats the whole
 * restarted answer as the inside of that string. Once a span balances, the
 * search skips past it — what is nested inside a complete answer is part of
 * it, not an alternative to it.
 */
export function extractJsonCandidates(text: string): string[] {
  const source = unfence(text);
  const found: string[] = [];
  let examined = 0;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char !== "{" && char !== "[") continue;
    if (++examined > MAX_CANDIDATE_STARTS) break;

    const { complete } = scan(source.slice(i));
    if (complete === null) continue;

    found.push(source.slice(i, i + complete));
    i += complete - 1;
  }

  return found;
}

/**
 * Closes an unfinished reply at its last complete element.
 *
 * Only for a reply that was genuinely cut off. What comes back is valid JSON
 * that is missing its tail, which validation downstream will notice and name.
 */
export function repairTruncatedJson(text: string): string | null {
  const source = unfence(text);
  const { start, complete, safe } = scan(source);
  if (start === -1) return null;
  if (complete !== null) return source.slice(start, complete);
  if (!safe.length) return null;

  const last = safe[safe.length - 1];
  const closers = [...last.stack].reverse().join("");
  return source.slice(start, last.end) + closers;
}

/**
 * Parses a reply, without repairing it.
 *
 * This is what decides whether a reply is finished, so it must not be
 * forgiving: treating a truncated reply as complete is how a course ends up
 * with four bonuses and nobody noticing.
 */
export function strictParseJson<T>(text: string, accepts?: (value: unknown) => boolean): T | null {
  const source = unfence(text);
  const usable = (value: unknown) => !accepts || accepts(value);

  try {
    const whole = JSON.parse(source) as T;
    if (usable(whole)) return whole;
  } catch {
    // Prose around the JSON, most likely. Fall through to the scanner.
  }

  // `accepts` is what makes this safe, and it is the caller's job to pass it.
  // Every element of an array is a balanced candidate in its own right, so
  // without a shape check a reply cut off after five steps would return
  // `{"number": 1, …}` — a perfectly valid object, and completely the wrong
  // one — and be treated as a finished reply. With the check, only something
  // shaped like the whole answer counts. Longest wins among those.
  let best: T | null = null;
  let bestLength = 0;

  for (const candidate of extractJsonCandidates(source)) {
    if (candidate.length <= bestLength) continue;
    try {
      const parsed = JSON.parse(candidate) as T;
      if (!usable(parsed)) continue;
      best = parsed;
      bestLength = candidate.length;
    } catch {
      // Balanced but not valid JSON — a stray brace in prose, say.
    }
  }

  return best;
}

/**
 * Parses a reply, repairing a truncated one as a last resort.
 *
 * Throws with a message safe to show a coach; the raw reply goes to the
 * function log, because a parse failure is impossible to diagnose without it.
 */
export function parseModelJson<T>(
  text: string,
  label = "The model",
  accepts?: (value: unknown) => boolean,
): T {
  const strict = strictParseJson<T>(text, accepts);
  if (strict !== null) return strict;

  const repaired = repairTruncatedJson(text);
  if (repaired) {
    try {
      const parsed = JSON.parse(repaired) as T;
      // A repair that produced the wrong shape is not a recovery. Better to
      // fail here and let the retry say so than to hand back half an answer
      // wearing the right name.
      if (!accepts || accepts(parsed)) return parsed;
    } catch {
      // Fall through to the throw below.
    }
  }

  console.error(`${label} returned unparseable JSON:`, text.slice(0, 2000));
  throw new Error(
    `${label} did not return usable JSON. The reply was ${text.length} characters and may have been cut off.`,
  );
}
