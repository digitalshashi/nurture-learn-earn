// Getting a readable sentence out of whatever was thrown.
//
// `e instanceof Error ? e.message : String(e)` is the obvious thing to write
// and it is wrong here, because the two failures this app hits most often are
// both non-Error objects:
//
//   1. PostgREST errors. The type declaration says `class PostgrestError
//      extends Error`, but at runtime supabase-js assigns the parsed response
//      body straight through — `error = JSON.parse(body)` — so it is a plain
//      object. `instanceof Error` is false and String() gives "[object
//      Object]", which is what a coach ends up reading in a toast.
//
//   2. Edge function errors. These *are* Error instances, but the message is
//      always the useless "Edge Function returned a non-2xx status code". The
//      part worth showing — "no provider connected", "approve six valid steps
//      first" — is in the response body hanging off `context`.
//
// So: errorMessage() for anything synchronous, edgeErrorMessage() when the
// throw might have come from functions.invoke().

/**
 * Postgres and PostgREST codes for "that table is not there".
 *
 * Worth naming, because it has exactly one cause in this codebase — a
 * migration that has not been pushed yet — and the raw text ("Could not find
 * the table 'public.x' in the schema cache") sends people looking for a bug in
 * the app instead.
 */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * A sentence worth showing someone, from an Error, a PostgREST error object,
 * a string, or anything else.
 *
 * Never returns "[object Object]" and never returns an empty string.
 */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  const direct = text(error);
  if (direct) return direct;

  if (!isRecord(error)) return fallback;

  const code = text(error.code);
  const message = text(error.message);

  if (code && MISSING_TABLE_CODES.has(code)) {
    return "This feature's database tables have not been created yet. Apply the pending migrations, then reload.";
  }

  if (!message) {
    // Some clients only ever set one of these.
    return text(error.error_description) ?? text(error.details) ?? text(error.error) ?? fallback;
  }

  // `details` and `hint` are where PostgREST puts the part that actually says
  // what to do, so they are appended when they add something new.
  const extra = [text(error.details), text(error.hint)].filter(
    (part): part is string => Boolean(part) && !message.includes(part as string),
  );

  return extra.length ? `${message} — ${extra.join(" ")}` : message;
}

/**
 * Same, but reads an edge function's JSON body first.
 *
 * supabase-js throws a FunctionsHttpError whose message is the same generic
 * line for every non-2xx status, with the real one — the message our own
 * function chose to return — only reachable through `context`.
 */
export async function edgeErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): Promise<string> {
  const context = (error as { context?: Response })?.context;

  if (context && typeof context.clone === "function") {
    try {
      const body = await context.clone().json();
      const fromBody = text(body?.error) ?? text(body?.message);
      if (fromBody) return fromBody;
    } catch {
      // Not JSON, or the body was already consumed. Fall through.
    }
  }

  return errorMessage(error, fallback);
}
