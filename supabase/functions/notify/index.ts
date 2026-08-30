// One way in for every email the platform sends about something happening.
//
// Callers raise an event — "course.completed", "payment.succeeded" — and this
// works out which templates that fires, who receives each one, and what to
// fill them with. Callers never name a template and never name a recipient:
// the first would let the browser send any email it liked, the second would
// make this an open relay for templated mail.
//
// Sending is best effort by design. A learner finishing a course must not see
// an error because an SMTP host was slow.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/edge.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";
import {
  AUTO_LINKS,
  NOTIFICATIONS,
  templatesForEvent,
  type NotificationSpec,
} from "../_shared/notifications.ts";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

/** Where links in an email should point. */
function siteUrl(): string {
  return (Deno.env.get("PUBLIC_SITE_URL") || "https://learn.jointeluguai.com").replace(
    /\/+$/,
    "",
  );
}

/**
 * Who gets this one.
 *
 * The caller says which subject the event concerns — a learner id, a coach id
 * — and this reads the address from the database. The address never travels in
 * the request, so a compromised client cannot redirect an email anywhere.
 */
async function resolveRecipient(
  spec: NotificationSpec,
  learner: Profile | null,
  coach: Profile | null,
): Promise<Profile | null> {
  return spec.audience === "coach" ? coach : learner;
}

/** A coach can switch any of these off; an unset toggle means on. */
async function isEnabled(coachId: string | null, templateKey: string): Promise<boolean> {
  if (!coachId) return true;

  const { data } = await adminClient()
    .from("automation_event_toggles")
    .select("is_enabled")
    .eq("coach_id", coachId)
    .eq("channel", "email")
    .eq("event_key", templateKey)
    .maybeSingle();

  return (data as { is_enabled: boolean } | null)?.is_enabled ?? true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { userId, error: authError } = await requireUser(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const event = String(body.event || "");

    const keys = templatesForEvent(event);
    if (!keys.length) return json({ error: `Unknown event "${event}"` }, 400);

    const admin = adminClient();

    // The learner defaults to whoever is signed in. A caller may name someone
    // else — a coach telling a class about a new lesson — but only ever by id,
    // and only ever someone the database already knows.
    const learnerId = body.learner_id ? String(body.learner_id) : userId;
    const coachId = body.coach_id ? String(body.coach_id) : null;

    const ids = [...new Set([learnerId, coachId].filter(Boolean))] as string[];
    const { data: people } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);

    const byId = new Map(((people ?? []) as Profile[]).map((row) => [row.id, row]));
    const learner = byId.get(learnerId) ?? null;
    const coach = coachId ? (byId.get(coachId) ?? null) : null;

    // The academy is the coach's own name where there is one; the platform's
    // otherwise. It appears in the header and footer of every template.
    const academyName =
      String(body.academy_name || "") || coach?.full_name || "Your academy";

    const site = siteUrl();
    const links: Record<string, string> = {};
    for (const [name, path] of Object.entries(AUTO_LINKS)) links[name] = `${site}${path}`;

    const supplied = (body.variables ?? {}) as Record<string, string>;
    const sent: string[] = [];
    const skipped: string[] = [];

    for (const templateKey of keys) {
      const spec = NOTIFICATIONS[templateKey];
      const recipient = await resolveRecipient(spec, learner, coach);

      if (!recipient?.email) {
        skipped.push(`${templateKey}: no address for the ${spec.audience}`);
        continue;
      }

      if (!(await isEnabled(coachId, templateKey))) {
        skipped.push(`${templateKey}: switched off`);
        continue;
      }

      const missing = spec.required.filter((name) => !supplied[name]);
      if (missing.length) {
        // Better a log than an email printing {{lesson_name}} at someone.
        console.error(`${templateKey} not sent — missing: ${missing.join(", ")}`);
        skipped.push(`${templateKey}: missing ${missing.join(", ")}`);
        continue;
      }

      await sendTemplatedEmail({
        templateKey,
        to: recipient.email,
        coachId,
        variables: {
          ...links,
          ...supplied,
          full_name: recipient.full_name || "there",
          coach_name: coach?.full_name || academyName,
          academy_name: academyName,
          year: String(new Date().getFullYear()),
        },
      });

      sent.push(templateKey);
    }

    return json({ event, sent, skipped });
  } catch (err) {
    console.error("notify error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
