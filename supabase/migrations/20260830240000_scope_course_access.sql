-- Course content belongs to the people who bought it.
--
-- Three policies let any signed-in account read every course on the platform:
--
--   courses   USING (is_published = true OR coach_id = auth.uid())
--   sections  USING (true)
--   chapters  USING (true)
--
-- So a super admin's courses appeared in every coach's and every student's
-- catalogue, which is the visible half. The invisible half is worse: chapters
-- carry content, video_url and resources, and `USING (true)` handed all of it
-- to anyone with an account. A learner on one academy could read every other
-- academy's entire course library without paying for any of it.
--
-- Access is now what the learner actually holds: a direct enrolment, or a
-- service they bought that carries the course.

-- ── Supporting indexes ─────────────────────────────────────────────────────
-- These run inside a policy, once per row scanned, so they need to be cheap.

CREATE INDEX IF NOT EXISTS enrollments_user_course_idx
  ON public.enrollments (user_id, course_id);

CREATE INDEX IF NOT EXISTS service_users_user_status_idx
  ON public.service_users (user_id, status);

CREATE INDEX IF NOT EXISTS service_courses_course_idx
  ON public.service_courses (course_id, service_id);

CREATE INDEX IF NOT EXISTS courses_service_idx
  ON public.courses (service_id) WHERE service_id IS NOT NULL;

-- ── Does this person hold this course? ─────────────────────────────────────
--
-- SECURITY DEFINER so the policy can look at enrolments and entitlements the
-- viewer cannot read directly. It answers only about the viewer passed in, and
-- returns a boolean, so it discloses nothing beyond "yes or no" about them.

CREATE OR REPLACE FUNCTION public.has_course_access(course uuid, viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Enrolled directly: a free course, or a coach granting access by hand.
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course AND e.user_id = viewer
    )
    -- Or holds a live service that bundles this course.
    OR EXISTS (
      SELECT 1
      FROM public.service_users su
      JOIN public.service_courses sc ON sc.service_id = su.service_id
      WHERE su.user_id = viewer
        AND sc.course_id = course
        AND su.status = 'active'
        AND (su.expires_at IS NULL OR su.expires_at > now())
    )
    -- Or the course hangs straight off a service they hold, with no bundle row.
    OR EXISTS (
      SELECT 1
      FROM public.service_users su
      JOIN public.courses c ON c.service_id = su.service_id
      WHERE su.user_id = viewer
        AND c.id = course
        AND su.status = 'active'
        AND (su.expires_at IS NULL OR su.expires_at > now())
    );
$$;

-- Who may administer any course, regardless of who owns it.
CREATE OR REPLACE FUNCTION public.is_platform_staff(viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(viewer, 'admin') OR public.has_role(viewer, 'super_admin');
$$;

-- ── courses ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;

CREATE POLICY "Owners, staff and entitled learners can view courses"
  ON public.courses FOR SELECT TO authenticated
  USING (
    coach_id = auth.uid()
    OR public.is_platform_staff(auth.uid())
    OR public.has_course_access(id, auth.uid())
  );

-- ── sections ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view sections of accessible courses" ON public.sections;

CREATE POLICY "Sections follow the course they belong to"
  ON public.sections FOR SELECT TO authenticated
  USING (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sections.course_id
        AND (c.coach_id = auth.uid() OR public.has_course_access(c.id, auth.uid()))
    )
  );

-- ── chapters ───────────────────────────────────────────────────────────────
--
-- The one that actually mattered: this is where video_url, content and
-- resources live.

DROP POLICY IF EXISTS "Users can view chapters" ON public.chapters;

CREATE POLICY "Chapters follow the course they belong to"
  ON public.chapters FOR SELECT TO authenticated
  USING (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.sections s
      JOIN public.courses c ON c.id = s.course_id
      WHERE s.id = chapters.section_id
        AND (c.coach_id = auth.uid() OR public.has_course_access(c.id, auth.uid()))
    )
  );
