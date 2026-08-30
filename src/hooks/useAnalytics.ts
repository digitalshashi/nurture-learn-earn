import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RANGES, windowFor, type RangeKey } from "@/lib/analytics";

/**
 * The rows every analytics screen is computed from.
 *
 * One loader per scope, each fetching raw rows and leaving every calculation
 * to src/lib/analytics.ts. Nothing is aggregated in SQL: the volumes here are
 * a single coach's own records, and keeping the arithmetic in one tested place
 * matters more than the round trip it saves.
 */

export interface TxnRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  occurred_at: string;
  service_id: string | null;
  item_name: string | null;
  user_id: string | null;
  customer_email: string | null;
}

export interface EventRow {
  event_type: string;
  subject_id: string | null;
  session_id: string;
  device: string | null;
  referrer_host: string | null;
  created_at: string;
}

export interface CoachAnalytics {
  transactions: TxnRow[];
  events: EventRow[];
  /** Enrolments in this coach's courses, with the course they belong to. */
  enrolments: { user_id: string; course_id: string; enrolled_at: string }[];
  courses: { id: string; title: string; is_published: boolean }[];
  services: { id: string; title: string; price: number; status: string }[];
  /** Lesson progress rows for this coach's chapters. */
  progress: { user_id: string; chapter_id: string; completed: boolean; updated_at: string }[];
  chapterCount: number;
  registrations: { user_id: string; event_id: string; registered_at: string }[];
  posts: { id: string; created_at: string; view_count: number | null }[];
}

const EMPTY_COACH: CoachAnalytics = {
  transactions: [],
  events: [],
  enrolments: [],
  courses: [],
  services: [],
  progress: [],
  chapterCount: 0,
  registrations: [],
  posts: [],
};

/** Ids as a plain array, for the `.in()` filters below. */
const idsOf = <T extends { id: string }>(rows: T[] | null): string[] =>
  (rows ?? []).map((row) => row.id);

/**
 * A coach's own numbers: what sold, who enrolled, what they did next.
 *
 * The window is applied per query rather than after loading everything, so a
 * coach with three years of history does not download all of it to draw a
 * seven-day chart.
 */
export function useCoachAnalytics(coachId: string | undefined, range: RangeKey) {
  const [data, setData] = useState<CoachAnalytics>(EMPTY_COACH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!coachId) return;
    setLoading(true);
    setError(null);

    // Trends compare against the window before this one, so both are fetched.
    const { previousFrom } = windowFor(RANGES[range]);
    const since = previousFrom.toISOString();

    const [txnRes, eventRes, courseRes, serviceRes, postRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, amount, currency, status, type, occurred_at, service_id, item_name, user_id, customer_email")
        .eq("coach_id", coachId)
        .gte("occurred_at", since),
      supabase
        .from("analytics_events")
        .select("event_type, subject_id, session_id, device, referrer_host, created_at")
        .eq("coach_id", coachId)
        .gte("created_at", since),
      supabase.from("courses").select("id, title, is_published").eq("coach_id", coachId),
      supabase.from("services").select("id, title, price, status").eq("coach_id", coachId),
      supabase
        .from("posts")
        .select("id, created_at, view_count")
        .eq("user_id", coachId)
        .gte("created_at", since),
    ]);

    const firstError = [txnRes, eventRes, courseRes, serviceRes, postRes].find((r) => r.error);
    if (firstError?.error) setError(firstError.error.message);

    const courses = (courseRes.data ?? []) as CoachAnalytics["courses"];
    const courseIds = idsOf(courses);

    // Enrolments and progress hang off courses, which is the only link back to
    // a coach — neither table carries a coach_id of its own.
    const [enrolRes, chapterRes, eventsOwnedRes] = await Promise.all([
      courseIds.length
        ? supabase
            .from("enrollments")
            .select("user_id, course_id, enrolled_at")
            .in("course_id", courseIds)
            .gte("enrolled_at", since)
        : Promise.resolve({ data: [], error: null }),
      courseIds.length
        ? supabase.from("chapters").select("id, section_id, sections!inner(course_id)").in(
            "sections.course_id",
            courseIds,
          )
        : Promise.resolve({ data: [], error: null }),
      supabase.from("events").select("id").eq("created_by", coachId),
    ]);

    const chapterIds = idsOf((chapterRes.data ?? []) as { id: string }[]);
    const eventIds = idsOf((eventsOwnedRes.data ?? []) as { id: string }[]);

    const [progressRes, regRes] = await Promise.all([
      chapterIds.length
        ? supabase
            .from("chapter_progress")
            .select("user_id, chapter_id, completed, updated_at")
            .in("chapter_id", chapterIds)
            .gte("updated_at", since)
        : Promise.resolve({ data: [], error: null }),
      eventIds.length
        ? supabase
            .from("event_registrations")
            .select("user_id, event_id, registered_at")
            .in("event_id", eventIds)
            .gte("registered_at", since)
        : Promise.resolve({ data: [], error: null }),
    ]);

    setData({
      transactions: (txnRes.data ?? []) as unknown as TxnRow[],
      events: (eventRes.data ?? []) as unknown as EventRow[],
      enrolments: (enrolRes.data ?? []) as CoachAnalytics["enrolments"],
      courses,
      services: (serviceRes.data ?? []) as CoachAnalytics["services"],
      progress: (progressRes.data ?? []) as CoachAnalytics["progress"],
      chapterCount: chapterIds.length,
      registrations: (regRes.data ?? []) as CoachAnalytics["registrations"],
      posts: (postRes.data ?? []) as CoachAnalytics["posts"],
    });
    setLoading(false);
  }, [coachId, range]);

  useEffect(() => {
    if (coachId) load();
  }, [coachId, load]);

  return { data, loading, error, reload: load };
}

export interface StudentAnalytics {
  enrolments: { course_id: string; enrolled_at: string }[];
  courses: { id: string; title: string }[];
  progress: { chapter_id: string; completed: boolean; updated_at: string; progress_percent: number | null }[];
  chaptersPerCourse: Record<string, number>;
  chapterCourse: Record<string, string>;
  xp: { xp_amount: number; action: string; created_at: string }[];
  registrations: { event_id: string; registered_at: string }[];
  purchases: { amount_paid: number | null; purchased_at: string | null; service_id: string }[];
  certificates: number;
}

const EMPTY_STUDENT: StudentAnalytics = {
  enrolments: [],
  courses: [],
  progress: [],
  chaptersPerCourse: {},
  chapterCourse: {},
  xp: [],
  registrations: [],
  purchases: [],
  certificates: 0,
};

/**
 * A learner's own record: what they joined, finished, earned and spent.
 *
 * Every row here is the viewer's own, which is why this needs no permission
 * beyond being signed in — RLS already scopes each table to auth.uid().
 */
export function useStudentAnalytics(userId: string | undefined) {
  const [data, setData] = useState<StudentAnalytics>(EMPTY_STUDENT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [enrolRes, progressRes, xpRes, regRes, purchaseRes, certRes] = await Promise.all([
      supabase.from("enrollments").select("course_id, enrolled_at").eq("user_id", userId),
      supabase
        .from("chapter_progress")
        .select("chapter_id, completed, updated_at, progress_percent")
        .eq("user_id", userId),
      supabase.from("xp_transactions").select("xp_amount, action, created_at").eq("user_id", userId),
      supabase.from("event_registrations").select("event_id, registered_at").eq("user_id", userId),
      supabase
        .from("service_users")
        .select("amount_paid, purchased_at, service_id")
        .eq("user_id", userId),
      supabase
        .from("issued_certificates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const courseIds = [...new Set(((enrolRes.data ?? []) as { course_id: string }[]).map((r) => r.course_id))];

    // Chapter counts turn "3 lessons done" into "3 of 12", which is the only
    // form of that number anyone can act on.
    const [courseRes, chapterRes] = await Promise.all([
      courseIds.length
        ? supabase.from("courses").select("id, title").in("id", courseIds)
        : Promise.resolve({ data: [], error: null }),
      courseIds.length
        ? supabase
            .from("chapters")
            .select("id, sections!inner(course_id)")
            .in("sections.course_id", courseIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const chaptersPerCourse: Record<string, number> = {};
    const chapterCourse: Record<string, string> = {};
    for (const row of (chapterRes.data ?? []) as {
      id: string;
      sections: { course_id: string } | { course_id: string }[];
    }[]) {
      const section = Array.isArray(row.sections) ? row.sections[0] : row.sections;
      const courseId = section?.course_id;
      if (!courseId) continue;
      chaptersPerCourse[courseId] = (chaptersPerCourse[courseId] ?? 0) + 1;
      chapterCourse[row.id] = courseId;
    }

    setData({
      enrolments: (enrolRes.data ?? []) as StudentAnalytics["enrolments"],
      courses: (courseRes.data ?? []) as StudentAnalytics["courses"],
      progress: (progressRes.data ?? []) as StudentAnalytics["progress"],
      chaptersPerCourse,
      chapterCourse,
      xp: (xpRes.data ?? []) as StudentAnalytics["xp"],
      registrations: (regRes.data ?? []) as StudentAnalytics["registrations"],
      purchases: (purchaseRes.data ?? []) as StudentAnalytics["purchases"],
      certificates: certRes.count ?? 0,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  return { data, loading, reload: load };
}

export interface PlatformAnalytics {
  transactions: TxnRow[];
  events: EventRow[];
  profiles: { id: string; created_at: string }[];
  roles: { user_id: string; role: string }[];
  subscriptions: { coach_id: string; plan_id: string | null; status: string; created_at: string }[];
  plans: { id: string; name: string; monthly_price: number; yearly_price: number; billing_type: string }[];
  sessions: { user_id: string; last_active: string | null; device: string | null }[];
  courses: { id: string; coach_id: string; is_published: boolean }[];
  services: { id: string; coach_id: string; status: string }[];
}

const EMPTY_PLATFORM: PlatformAnalytics = {
  transactions: [],
  events: [],
  profiles: [],
  roles: [],
  subscriptions: [],
  plans: [],
  sessions: [],
  courses: [],
  services: [],
};

/**
 * The whole platform, for whoever runs it.
 *
 * Reaches across every tenant, which is exactly what the admin RLS policies
 * allow and nobody else's do — a coach running this gets their own rows back
 * and the totals simply describe them.
 */
export function usePlatformAnalytics(range: RangeKey, enabled: boolean) {
  const [data, setData] = useState<PlatformAnalytics>(EMPTY_PLATFORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { previousFrom } = windowFor(RANGES[range]);
    const since = previousFrom.toISOString();

    const [txnRes, eventRes, profileRes, roleRes, subRes, planRes, sessionRes, courseRes, serviceRes] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("id, amount, currency, status, type, occurred_at, service_id, item_name, user_id, customer_email")
          .gte("occurred_at", since),
        supabase
          .from("analytics_events")
          .select("event_type, subject_id, session_id, device, referrer_host, created_at")
          .gte("created_at", since),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("coach_subscriptions").select("coach_id, plan_id, status, created_at"),
        supabase.from("saas_plans").select("id, name, monthly_price, yearly_price, billing_type"),
        supabase.from("login_sessions").select("user_id, last_active, device").gte("last_active", since),
        supabase.from("courses").select("id, coach_id, is_published"),
        supabase.from("services").select("id, coach_id, status"),
      ]);

    const firstError = [txnRes, eventRes, profileRes, roleRes, subRes].find((r) => r.error);
    if (firstError?.error) setError(firstError.error.message);

    setData({
      transactions: (txnRes.data ?? []) as unknown as TxnRow[],
      events: (eventRes.data ?? []) as unknown as EventRow[],
      profiles: (profileRes.data ?? []) as PlatformAnalytics["profiles"],
      roles: (roleRes.data ?? []) as PlatformAnalytics["roles"],
      subscriptions: (subRes.data ?? []) as PlatformAnalytics["subscriptions"],
      plans: (planRes.data ?? []) as PlatformAnalytics["plans"],
      sessions: (sessionRes.data ?? []) as PlatformAnalytics["sessions"],
      courses: (courseRes.data ?? []) as PlatformAnalytics["courses"],
      services: (serviceRes.data ?? []) as PlatformAnalytics["services"],
    });
    setLoading(false);
  }, [range]);

  useEffect(() => {
    if (enabled) load();
    else setLoading(false);
  }, [enabled, load]);

  return { data, loading, error, reload: load };
}
