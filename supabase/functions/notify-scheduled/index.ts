// The emails whose trigger is a date arriving rather than someone acting.
//
// Reminders, digests and expiry warnings cannot be sent from a call site,
// because nothing happens at the moment they are due — that is the whole point
// of them. This runs on a schedule and looks for what has become true.
//
// Every query is bounded to a window rather than "everything overdue", so a
// run that was missed does not wake up and send a month of reminders at once.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, json } from "../_shared/edge.ts";
import { sendTemplatedEmail } from "../_shared/email.ts";
import { AUTO_LINKS, NOTIFICATIONS } from "../_shared/notifications.ts";

const site = () =>
  (Deno.env.get("PUBLIC_SITE_URL") || "https://1corehub.sasivanga.workers.dev").replace(/\/+$/, "");

const links = () => {
  const base = site();
  const out: Record<string, string> = {};
  for (const [name, path] of Object.entries(AUTO_LINKS)) out[name] = `${base}${path}`;
  return out;
};

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const shortTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/**
 * Date buckets for the reminders that legitimately recur.
 *
 * A one-off — an event starting, an access window expiring — can key on the
 * thing itself and never repeat. A nudge is different: this week's digest is
 * supposed to follow last week's, so the key has to change when the period
 * does, and only then. Bucketing by day or week gives the second run inside a
 * period the same key as the first, and next period's run a new one.
 */
const dayBucket = (now: Date) => now.toISOString().slice(0, 10);

const weekBucket = (now: Date) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // ISO week: Thursday of the current week decides the year and number.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}W${String(week).padStart(2, "0")}`;
};

interface Recipient {
  id: string;
  full_name: string | null;
  email: string | null;
}

/** One send, with everything the shared shell always needs. */
async function send(
  templateKey: string,
  person: Recipient,
  coachId: string | null,
  academyName: string,
  variables: Record<string, string>,
  /**
   * What this reminder is *about*, so it can only be sent once.
   *
   * Each query here is bounded to a window matched to the schedule, which
   * stops a missed run flushing a month of backlog — but it does nothing about
   * the same run happening twice. A retry after a timeout, two instances alive
   * across a deploy, or a window that shifts slightly all re-select the same
   * rows, and the recipient gets the reminder twice. The key names the
   * occasion rather than the message, so the second attempt is dropped at the
   * send path instead.
   */
  dedupeKey: string,
) {
  if (!person.email) return false;

  // A platform-level send has no coach, and comparing a uuid column to the
  // empty string is a type error rather than a miss — Postgres rejects it,
  // the toggle silently reads as unset, and the query errors on every run.
  if (coachId) {
    const { data } = await adminClient()
      .from("automation_event_toggles")
      .select("is_enabled")
      .eq("coach_id", coachId)
      .eq("channel", "email")
      .eq("event_key", templateKey)
      .maybeSingle();

    if ((data as { is_enabled: boolean } | null)?.is_enabled === false) return false;
  }

  await sendTemplatedEmail({
    templateKey,
    to: person.email,
    coachId,
    dedupeKey,
    variables: {
      ...links(),
      ...variables,
      full_name: person.full_name || "there",
      academy_name: academyName,
      coach_name: academyName,
      year: String(new Date().getFullYear()),
    },
  });
  return true;
}

/**
 * Events starting inside the reminder window.
 *
 * The window is the hour ahead, matched to how often this runs — widening it
 * without changing the schedule would send the same reminder every run.
 */
async function eventReminders(now: Date): Promise<number> {
  const admin = adminClient();
  const from = now;
  const to = new Date(from.getTime() + 60 * 60 * 1000);

  const { data: events } = await admin
    .from("events")
    .select("id, title, start_time, end_time, meeting_link, created_by, service_id")
    .gte("start_time", from.toISOString())
    .lt("start_time", to.toISOString());

  // A one-to-one gets its own, differently worded reminder. Without this
  // split, booking a consultation would send both.
  const consultations = await consultationServiceIds();
  let sent = 0;

  for (const event of (events ?? []) as {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    meeting_link: string | null;
    created_by: string;
    service_id: string | null;
  }[]) {
    const isConsultation = !!event.service_id && consultations.has(event.service_id);
    const { data: registrations } = await admin
      .from("event_registrations")
      .select("user_id")
      .eq("event_id", event.id);

    const userIds = ((registrations ?? []) as { user_id: string }[]).map((r) => r.user_id);
    if (!userIds.length) continue;

    const { data: people } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const { data: coach } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", event.created_by)
      .maybeSingle();

    const academy = (coach as { full_name: string } | null)?.full_name || "Your academy";
    const minutes = Math.max(
      0,
      Math.round(
        (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000,
      ),
    );

    for (const person of (people ?? []) as Recipient[]) {
      const ok = isConsultation
        ? await send(
            "consultation_reminder",
            person,
            event.created_by,
            academy,
            {
              event_time: shortTime(event.start_time),
              duration: `${minutes} minutes`,
              join_link: event.meeting_link || `${site()}/events`,
            },
            `consultation_reminder:${event.id}:${person.id}`,
          )
        : await send(
            "event_reminder",
            person,
            event.created_by,
            academy,
            {
              event_name: event.title,
              event_date: shortDate(event.start_time),
              event_time: shortTime(event.start_time),
              duration: `${minutes} minutes`,
              join_link: event.meeting_link || `${site()}/events`,
            },
            `event_reminder:${event.id}:${person.id}`,
          );
      if (ok) sent++;
    }
  }

  return sent;
}

/**
 * Subscriptions running out.
 *
 * Renewals are warned about three days ahead; a lapse is reported the day it
 * happens. Both windows are a single day wide so nobody is told twice.
 */
async function subscriptionNotices(): Promise<number> {
  const admin = adminClient();
  const now = new Date();

  const dayFrom = (days: number) => {
    const start = new Date(now);
    start.setDate(start.getDate() + days);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return [start.toISOString(), end.toISOString()] as const;
  };

  const [renewFrom, renewTo] = dayFrom(3);
  const [lapsedFrom, lapsedTo] = dayFrom(-1);

  const { data: plans } = await admin.from("saas_plans").select("id, name, monthly_price");
  const planById = new Map(
    ((plans ?? []) as { id: string; name: string; monthly_price: number }[]).map((p) => [p.id, p]),
  );

  let sent = 0;

  for (const [templateKey, from, to] of [
    ["subscription_renewal_reminder", renewFrom, renewTo],
    ["subscription_expired", lapsedFrom, lapsedTo],
  ] as const) {
    const { data: subs } = await admin
      .from("coach_subscriptions")
      .select("coach_id, plan_id, expires_at")
      .gte("expires_at", from)
      .lt("expires_at", to);

    for (const sub of (subs ?? []) as {
      coach_id: string;
      plan_id: string;
      expires_at: string;
    }[]) {
      const { data: person } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", sub.coach_id)
        .maybeSingle();

      if (!person) continue;
      const plan = planById.get(sub.plan_id);

      const ok = await send(
        templateKey,
        person as Recipient,
        sub.coach_id,
        (person as Recipient).full_name || "Your academy",
        templateKey === "subscription_renewal_reminder"
          ? {
              plan_name: plan?.name ?? "your plan",
              amount: String(plan?.monthly_price ?? 0),
              renewal_date: shortDate(sub.expires_at),
            }
          : {
              plan_name: plan?.name ?? "your plan",
              expiry_date: shortDate(sub.expires_at),
            },
        // The expiry date is part of the key: renewing moves it, and the new
        // term legitimately earns its own reminder.
        `${templateKey}:${sub.coach_id}:${sub.expires_at}`,
      );
      if (ok) sent++;
    }
  }

  return sent;
}

/** Services a coach sells as a one-to-one rather than as a group session. */
async function consultationServiceIds(): Promise<Set<string>> {
  const { data } = await adminClient()
    .from("services")
    .select("id")
    .eq("service_type", "consultation");
  return new Set(((data ?? []) as { id: string }[]).map((s) => s.id));
}

/** Lesson counts and titles for a set of courses, in one pass. */
async function courseLessons(courseIds: string[]) {
  const admin = adminClient();
  if (!courseIds.length) return { perCourse: new Map<string, string[]>(), chapterCourse: new Map<string, string>() };

  const { data } = await admin
    .from("chapters")
    .select("id, title, sort_order, sections!inner(course_id)")
    .in("sections.course_id", courseIds);

  const perCourse = new Map<string, string[]>();
  const chapterCourse = new Map<string, string>();

  for (const row of (data ?? []) as {
    id: string;
    title: string;
    sections: { course_id: string } | { course_id: string }[];
  }[]) {
    const section = Array.isArray(row.sections) ? row.sections[0] : row.sections;
    if (!section?.course_id) continue;
    chapterCourse.set(row.id, section.course_id);
    perCourse.set(section.course_id, [...(perCourse.get(section.course_id) ?? []), row.id]);
  }

  return { perCourse, chapterCourse };
}

/** The academy name for a coach, falling back to something sayable. */
async function academyFor(coachId: string | null): Promise<string> {
  if (!coachId) return "Your academy";
  const { data } = await adminClient()
    .from("profiles")
    .select("full_name")
    .eq("id", coachId)
    .maybeSingle();
  return (data as { full_name: string } | null)?.full_name || "Your academy";
}

/**
 * A course that was started and then left alone.
 *
 * Exactly seven days idle, not "seven or more": a window a day wide means one
 * nudge per learner per course, rather than the same message every hour until
 * they come back.
 */
async function idleCourses(now: Date): Promise<number> {
  const admin = adminClient();

  const from = new Date(now);
  from.setDate(from.getDate() - 8);
  const to = new Date(now);
  to.setDate(to.getDate() - 7);

  const { data: stale } = await admin
    .from("chapter_progress")
    .select("user_id, chapter_id, updated_at")
    .gte("updated_at", from.toISOString())
    .lt("updated_at", to.toISOString());

  const rows = (stale ?? []) as { user_id: string; chapter_id: string; updated_at: string }[];
  if (!rows.length) return 0;

  // Anyone who has touched anything since is not idle after all.
  const { data: recent } = await admin
    .from("chapter_progress")
    .select("user_id")
    .gte("updated_at", to.toISOString());

  const active = new Set(((recent ?? []) as { user_id: string }[]).map((r) => r.user_id));
  const candidates = rows.filter((r) => !active.has(r.user_id));
  if (!candidates.length) return 0;

  const { chapterCourse, perCourse } = await courseLessons(
    await courseIdsForChapters(candidates.map((r) => r.chapter_id)),
  );

  const { data: courses } = await admin
    .from("courses")
    .select("id, title, coach_id")
    .in("id", [...perCourse.keys()]);

  const courseById = new Map(
    ((courses ?? []) as { id: string; title: string; coach_id: string }[]).map((c) => [c.id, c]),
  );

  const people = await profilesFor([...new Set(candidates.map((r) => r.user_id))]);
  const seen = new Set<string>();
  let sent = 0;

  for (const row of candidates) {
    const courseId = chapterCourse.get(row.chapter_id);
    const course = courseId ? courseById.get(courseId) : undefined;
    const person = people.get(row.user_id);
    if (!course || !person) continue;

    // One per learner per course, however many lessons went stale together.
    const key = `${row.user_id}:${course.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const total = perCourse.get(course.id)?.length ?? 0;
    const done = await completedCount(row.user_id, perCourse.get(course.id) ?? []);

    const ok = await send(
      "course_reminder",
      person,
      course.coach_id,
      await academyFor(course.coach_id),
      {
        course_name: course.title,
        lesson_name: "your next lesson",
        progress_percent: String(total ? Math.round((done / total) * 100) : 0),
        resume_link: `${site()}/course-player/${course.id}`,
      },
      `course_reminder:${course.id}:${person.id}:${dayBucket(new Date())}`,
    );
    if (ok) sent++;
  }

  return sent;
}

/** Which courses a set of chapters belong to. */
async function courseIdsForChapters(chapterIds: string[]): Promise<string[]> {
  if (!chapterIds.length) return [];
  const { data } = await adminClient()
    .from("chapters")
    .select("sections!inner(course_id)")
    .in("id", [...new Set(chapterIds)]);

  const ids = new Set<string>();
  for (const row of (data ?? []) as { sections: { course_id: string } | { course_id: string }[] }[]) {
    const section = Array.isArray(row.sections) ? row.sections[0] : row.sections;
    if (section?.course_id) ids.add(section.course_id);
  }
  return [...ids];
}

/** How many of a course's lessons this learner has finished. */
async function completedCount(userId: string, chapterIds: string[]): Promise<number> {
  if (!chapterIds.length) return 0;
  const { count } = await adminClient()
    .from("chapter_progress")
    .select("chapter_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true)
    .in("chapter_id", chapterIds);
  return count ?? 0;
}

/** Profiles by id, for a batch of recipients. */
async function profilesFor(ids: string[]): Promise<Map<string, Recipient>> {
  if (!ids.length) return new Map();
  const { data } = await adminClient()
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  return new Map(((data ?? []) as Recipient[]).map((p) => [p.id, p]));
}

/**
 * The weekly summary, on Mondays only.
 *
 * Sent from an hourly job, so the hour is pinned too — without that it would
 * go out twenty-four times every Monday.
 */
async function weeklyDigest(now: Date): Promise<number> {
  if (now.getUTCDay() !== 1 || now.getUTCHours() !== 8) return 0;

  const admin = adminClient();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);

  const { data: week } = await admin
    .from("chapter_progress")
    .select("user_id, chapter_id, updated_at")
    .eq("completed", true)
    .gte("updated_at", from.toISOString());

  const rows = (week ?? []) as { user_id: string; chapter_id: string; updated_at: string }[];
  if (!rows.length) return 0;

  const courseIds = await courseIdsForChapters(rows.map((r) => r.chapter_id));
  const { chapterCourse, perCourse } = await courseLessons(courseIds);

  const { data: courses } = await admin
    .from("courses")
    .select("id, title, coach_id")
    .in("id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"]);

  const courseById = new Map(
    ((courses ?? []) as { id: string; title: string; coach_id: string }[]).map((c) => [c.id, c]),
  );

  // One digest per learner per course, counting what they got through.
  const tally = new Map<string, { userId: string; courseId: string; lessons: number; days: Set<string> }>();
  for (const row of rows) {
    const courseId = chapterCourse.get(row.chapter_id);
    if (!courseId) continue;
    const key = `${row.user_id}:${courseId}`;
    const entry = tally.get(key) ?? { userId: row.user_id, courseId, lessons: 0, days: new Set<string>() };
    entry.lessons += 1;
    entry.days.add(row.updated_at.slice(0, 10));
    tally.set(key, entry);
  }

  const people = await profilesFor([...new Set(rows.map((r) => r.user_id))]);
  let sent = 0;

  for (const entry of tally.values()) {
    const course = courseById.get(entry.courseId);
    const person = people.get(entry.userId);
    if (!course || !person) continue;

    const total = perCourse.get(course.id)?.length ?? 0;
    const done = await completedCount(entry.userId, perCourse.get(course.id) ?? []);

    const ok = await send(
      "course_progress_digest",
      person,
      course.coach_id,
      await academyFor(course.coach_id),
      {
        course_name: course.title,
        lessons_this_week: String(entry.lessons),
        progress_percent: String(total ? Math.round((done / total) * 100) : 0),
        streak_days: String(entry.days.size),
        resume_link: `${site()}/course-player/${course.id}`,
      },
      `course_progress_digest:${course.id}:${person.id}:${weekBucket(now)}`,
    );
    if (ok) sent++;
  }

  return sent;
}

/** Access running out in a week, warned once. */
async function accessExpiring(now: Date): Promise<number> {
  const admin = adminClient();

  const start = new Date(now);
  start.setDate(start.getDate() + 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: expiring } = await admin
    .from("service_users")
    .select("user_id, service_id, expires_at")
    .gte("expires_at", start.toISOString())
    .lt("expires_at", end.toISOString());

  const rows = (expiring ?? []) as { user_id: string; service_id: string; expires_at: string }[];
  if (!rows.length) return 0;

  const { data: services } = await admin
    .from("services")
    .select("id, title, coach_id")
    .in("id", [...new Set(rows.map((r) => r.service_id))]);

  const serviceById = new Map(
    ((services ?? []) as { id: string; title: string; coach_id: string }[]).map((s) => [s.id, s]),
  );
  const people = await profilesFor([...new Set(rows.map((r) => r.user_id))]);
  let sent = 0;

  for (const row of rows) {
    const service = serviceById.get(row.service_id);
    const person = people.get(row.user_id);
    if (!service || !person) continue;

    const ok = await send(
      "course_access_expiring",
      person,
      service.coach_id,
      await academyFor(service.coach_id),
      {
        course_name: service.title,
        expiry_date: shortDate(row.expires_at),
        days_left: "7",
        // Progress across a bundle is not a single number, and inventing one
        // would be worse than leaving it as what is actually known.
        progress_percent: "0",
      },
      `course_access_expiring:${service.id}:${person.id}:${row.expires_at}`,
    );
    if (ok) sent++;
  }

  return sent;
}

/**
 * A checkout opened yesterday and never finished.
 *
 * Only where the visitor was signed in — an anonymous checkout view has no
 * address attached to it, and guessing one is not an option.
 */
async function abandonedCheckouts(now: Date): Promise<number> {
  const admin = adminClient();

  const start = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  const end = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: views } = await admin
    .from("analytics_events")
    .select("coach_id, subject_id, user_id, created_at")
    .eq("event_type", "checkout_view")
    .not("user_id", "is", null)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  const rows = (views ?? []) as {
    coach_id: string;
    subject_id: string | null;
    user_id: string;
    created_at: string;
  }[];
  if (!rows.length) return 0;

  // Anyone who went on to pay is not abandoned.
  const { data: paid } = await admin
    .from("transactions")
    .select("user_id, service_id")
    .eq("status", "completed")
    .gte("occurred_at", start.toISOString());

  const bought = new Set(
    ((paid ?? []) as { user_id: string | null; service_id: string | null }[]).map(
      (t) => `${t.user_id}:${t.service_id}`,
    ),
  );

  const serviceIds = [...new Set(rows.map((r) => r.subject_id).filter(Boolean))] as string[];
  const { data: services } = await admin
    .from("services")
    .select("id, title, price, slug, coach_id")
    .in("id", serviceIds.length ? serviceIds : ["00000000-0000-0000-0000-000000000000"]);

  const serviceById = new Map(
    ((services ?? []) as { id: string; title: string; price: number; slug: string; coach_id: string }[]).map(
      (s) => [s.id, s],
    ),
  );

  const people = await profilesFor([...new Set(rows.map((r) => r.user_id))]);
  const seen = new Set<string>();
  let sent = 0;

  for (const row of rows) {
    if (!row.subject_id) continue;
    const key = `${row.user_id}:${row.subject_id}`;
    if (seen.has(key) || bought.has(key)) continue;
    seen.add(key);

    const service = serviceById.get(row.subject_id);
    const person = people.get(row.user_id);
    if (!service || !person) continue;

    const ok = await send(
      "abandoned_checkout",
      person,
      service.coach_id,
      await academyFor(service.coach_id),
      {
        course_name: service.title,
        amount: String(service.price ?? 0),
        checkout_link: `${site()}/checkout/${service.slug || service.id}`,
      },
      // No date bucket: someone who browsed a checkout and didn't buy should be
      // nudged once, not once a day until they block the sender.
      `abandoned_checkout:${service.id}:${person.id}`,
    );
    if (ok) sent++;
  }

  return sent;
}

/** Workshop sessions starting in the hour ahead. */
async function workshopReminders(now: Date): Promise<number> {
  const admin = adminClient();
  const to = new Date(now.getTime() + 60 * 60 * 1000);

  const { data: occurrences } = await admin
    .from("workshop_occurrences")
    .select("id, workshop_id, start_time, meeting_link, occurrence_number, total_occurrences")
    .gte("start_time", now.toISOString())
    .lt("start_time", to.toISOString());

  const rows = (occurrences ?? []) as {
    id: string;
    workshop_id: string;
    start_time: string;
    meeting_link: string | null;
    occurrence_number: number | null;
    total_occurrences: number | null;
  }[];
  if (!rows.length) return 0;

  const { data: workshops } = await admin
    .from("workshops")
    .select("id, title, created_by, meeting_link")
    .in("id", [...new Set(rows.map((r) => r.workshop_id))]);

  const workshopById = new Map(
    ((workshops ?? []) as { id: string; title: string; created_by: string; meeting_link: string | null }[]).map(
      (w) => [w.id, w],
    ),
  );

  let sent = 0;

  for (const occurrence of rows) {
    const workshop = workshopById.get(occurrence.workshop_id);
    if (!workshop) continue;

    const { data: attendees } = await admin
      .from("workshop_attendees")
      .select("user_id")
      .eq("occurrence_id", occurrence.id);

    const people = await profilesFor(
      ((attendees ?? []) as { user_id: string }[]).map((a) => a.user_id),
    );
    const academy = await academyFor(workshop.created_by);

    for (const person of people.values()) {
      const ok = await send(
        "workshop_reminder",
        person,
        workshop.created_by,
        academy,
        {
          workshop_name: workshop.title,
          session_number: String(occurrence.occurrence_number ?? 1),
          total_sessions: String(occurrence.total_occurrences ?? 1),
          start_time: shortTime(occurrence.start_time),
          join_link: occurrence.meeting_link || workshop.meeting_link || `${site()}/events`,
        },
        `workshop_reminder:${occurrence.id}:${person.id}`,
      );
      if (ok) sent++;
    }
  }

  return sent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Called by the scheduler, never by a browser. The token is the one the
  // database generated for itself in 20260830170000 and keeps in a table only
  // the service role can read — so it is written down nowhere.
  const offered = req.headers.get("x-cron-secret") ?? req.headers.get("x-internal-secret") ?? "";
  const { data: stored } = await adminClient()
    .from("internal_secrets")
    .select("value")
    .eq("name", "notify_cron")
    .maybeSingle();

  const expected =
    (stored as { value: string } | null)?.value || Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";

  if (!expected || offered !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    // One clock for every query, so two of them cannot disagree about "now"
    // and land the same reminder in two different windows.
    const now = new Date();

    const results = {
      event_and_consultation_reminders: await eventReminders(now),
      subscriptions: await subscriptionNotices(),
      workshop_reminders: await workshopReminders(now),
      idle_courses: await idleCourses(now),
      weekly_digests: await weeklyDigest(now),
      access_expiring: await accessExpiring(now),
      abandoned_checkouts: await abandonedCheckouts(now),
    };

    // Which scheduled templates exist but are not yet driven from here, so
    // the gap is visible in a log rather than assumed to be zero.
    const driven = [
      "event_reminder",
      "consultation_reminder",
      "subscription_renewal_reminder",
      "subscription_expired",
      "workshop_reminder",
      "course_reminder",
      "course_progress_digest",
      "course_access_expiring",
      "abandoned_checkout",
    ];

    const pending = Object.entries(NOTIFICATIONS)
      .filter(([, spec]) => spec.trigger === "scheduled")
      .map(([key]) => key)
      .filter((key) => !driven.includes(key));

    return json({ sent: results, not_yet_scheduled: pending });
  } catch (err) {
    console.error("notify-scheduled error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
