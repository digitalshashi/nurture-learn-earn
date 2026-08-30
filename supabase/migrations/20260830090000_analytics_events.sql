-- First-party view tracking, so analytics can report visits and conversion.
--
-- Every number on the analytics page except two could already be derived from
-- data the platform holds — transactions, enrolments, progress, registrations.
-- The exceptions were "visits" and "conversion rate", which need to know that
-- someone looked at a checkout page and did not buy. Nothing recorded that, so
-- those two numbers were invented. This records them.
--
-- Deliberately thin on personal data: no IP address, no cookie, no fingerprint.
-- A visitor is identified by a random id their browser keeps for the session
-- and nothing else, which is enough to count unique visits and not enough to
-- follow anyone between sessions or between coaches.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Whose analytics this belongs to. Every event is scoped to one coach, so
  -- RLS can be a single equality check.
  coach_id uuid NOT NULL,

  event_type text NOT NULL CHECK (event_type IN (
    'page_view',      -- a public page or landing page was opened
    'checkout_view',  -- a checkout page was opened
    'checkout_start', -- the buyer pressed pay
    'purchase'        -- payment verified; also written by the payment flow
  )),

  -- What was looked at. Kept loose because a view can be of a service, a
  -- built page, an event or a workshop.
  subject_type text CHECK (subject_type IN ('service', 'page', 'event', 'workshop', 'course')),
  subject_id uuid,

  -- Random, browser-session scoped, not a cookie and not stable across
  -- sessions. Enough to count a visit once; useless for tracking a person.
  session_id text NOT NULL,

  -- Set only when the visitor happened to be signed in.
  user_id uuid,

  path text,
  referrer_host text,
  device text CHECK (device IN ('mobile', 'tablet', 'desktop')),

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Every query is "this coach, this window, grouped by day".
CREATE INDEX IF NOT EXISTS analytics_events_coach_time_idx
  ON public.analytics_events (coach_id, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_subject_idx
  ON public.analytics_events (subject_type, subject_id, created_at DESC);

-- Counting unique sessions per day is the most common aggregate.
CREATE INDEX IF NOT EXISTS analytics_events_session_idx
  ON public.analytics_events (coach_id, event_type, session_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone may record an event, including a signed-out visitor on a checkout
-- page — that is the entire point. Nobody may read one back except the coach
-- it belongs to, so a write-only endpoint leaks nothing.
DROP POLICY IF EXISTS "Anyone can record an event" ON public.analytics_events;
CREATE POLICY "Anyone can record an event"
  ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (coach_id IS NOT NULL);

DROP POLICY IF EXISTS "Coaches read their own events" ON public.analytics_events;
CREATE POLICY "Coaches read their own events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins read every event" ON public.analytics_events;
CREATE POLICY "Admins read every event"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- Write-only for a visitor: the columns they may set, and nothing to read.
REVOKE ALL ON public.analytics_events FROM anon;
GRANT INSERT (
  coach_id, event_type, subject_type, subject_id,
  session_id, user_id, path, referrer_host, device
) ON public.analytics_events TO anon;

-- Students get an analytics page of their own.
--
-- It was off because the only analytics that existed were a coach's business
-- numbers. The page now renders a personal view for a student — their own
-- progress, streak and spend — which is their data by definition.
INSERT INTO public.role_permissions (role, feature_key, enabled)
VALUES ('student', 'analytics', true)
ON CONFLICT (role, feature_key) DO UPDATE SET enabled = true;
