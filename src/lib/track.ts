import { supabase } from "@/integrations/supabase/client";

/**
 * Recording that someone looked at something.
 *
 * Deliberately minimal. There is no cookie, no IP address and no fingerprint:
 * a visitor is a random id their browser keeps until the tab closes, which is
 * enough to count a visit once and not enough to follow anyone anywhere.
 *
 * Every call is best-effort. Analytics failing must never break a checkout, so
 * nothing here throws and nothing here is awaited by the page.
 */

export type TrackedEvent = "page_view" | "checkout_view" | "checkout_start" | "purchase";
export type TrackedSubject = "service" | "page" | "event" | "workshop" | "course";

const SESSION_KEY = "analytics_session";

/** A per-tab id, regenerated whenever the browser forgets it. */
export function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // Private mode, or storage disabled. An un-remembered id still counts the
    // event; it just cannot be tied to the rest of the visit.
    return `anon_${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Which of the three layouts the visitor is on. Never a device fingerprint. */
export function deviceKind(width: number = window.innerWidth): "mobile" | "tablet" | "desktop" {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** The referring site, without the path — where from, not what they read. */
export function referrerHost(referrer: string = document.referrer): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname;
    return host === window.location.hostname ? null : host;
  } catch {
    return null;
  }
}

interface TrackOptions {
  /** Whose analytics this belongs to. Nothing is recorded without one. */
  coachId: string | null | undefined;
  event: TrackedEvent;
  subjectType?: TrackedSubject;
  subjectId?: string | null;
  userId?: string | null;
}

/** Events already sent this session, so a re-render is not a second visit. */
const sent = new Set<string>();

/**
 * Records one event, at most once per session per subject.
 *
 * React re-renders, remounts and strict-mode double effects would otherwise
 * turn one visit into several and quietly inflate every number built on it.
 */
export async function track(options: TrackOptions): Promise<void> {
  const { coachId, event, subjectType, subjectId, userId } = options;
  if (!coachId) return;

  const fingerprint = `${event}:${subjectType ?? ""}:${subjectId ?? ""}`;
  if (sent.has(fingerprint)) return;
  sent.add(fingerprint);

  try {
    await supabase.from("analytics_events").insert({
      coach_id: coachId,
      event_type: event,
      subject_type: subjectType ?? null,
      subject_id: subjectId ?? null,
      session_id: sessionId(),
      user_id: userId ?? null,
      path: window.location.pathname,
      referrer_host: referrerHost(),
      device: deviceKind(),
    });
  } catch {
    // A page must render whether or not it was counted.
    sent.delete(fingerprint);
  }
}

/** Clears the once-per-session guard. Exists for tests. */
export function resetTracking(): void {
  sent.clear();
}
