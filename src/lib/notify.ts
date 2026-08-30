import { supabase } from "@/integrations/supabase/client";

/**
 * Telling the platform that something happened, so it can email about it.
 *
 * The app never names a template and never names a recipient — it raises an
 * event and passes ids. Which emails that sends, and to whom, is decided
 * server-side from supabase/functions/_shared/notifications.ts, because the
 * browser is not a safe place to decide who receives mail.
 *
 * Every call is best effort. A learner finishing a course must not see an
 * error because an SMTP host was slow, so nothing here throws and nothing here
 * is awaited by the interaction that caused it.
 */

export interface NotifyOptions {
  /** Dotted event name from the registry, e.g. "course.completed". */
  event: string;
  /** Who it happened to. Defaults to the signed-in user. */
  learnerId?: string | null;
  /** The academy it belongs to — decides branding and the coach's own copy. */
  coachId?: string | null;
  /** Template variables the registry says this event requires. */
  variables?: Record<string, string>;
  /** Overrides the coach's name as the academy, for a white-label domain. */
  academyName?: string;
}

export async function notify(options: NotifyOptions): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("notify", {
      body: {
        event: options.event,
        learner_id: options.learnerId ?? null,
        coach_id: options.coachId ?? null,
        academy_name: options.academyName ?? null,
        variables: options.variables ?? {},
      },
    });
    if (error) console.error(`notify ${options.event} failed:`, error.message);
  } catch (err) {
    console.error(`notify ${options.event} threw:`, err);
  }
}

/** A link back into the app, for a variable a template needs. */
export const appLink = (path: string): string =>
  `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * A short, safe excerpt of something someone wrote.
 *
 * Comment and message templates quote the text that triggered them. Sending
 * the whole thing turns a notification into a copy of the conversation, and
 * sending raw HTML would put author-controlled markup inside an email.
 */
export function excerpt(text: string | null | undefined, limit = 140): string {
  if (!text) return "";
  const flat = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1).trimEnd()}…` : flat;
}
