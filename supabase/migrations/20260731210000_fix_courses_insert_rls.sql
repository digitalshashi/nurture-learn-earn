-- Fix: course creation failed with
--   "new row violates row-level security policy for table courses"
-- because INSERT only allowed coach/admin roles, while this project
-- uses super_admin (and may not have separate coach/admin role rows).

DROP POLICY IF EXISTS "Coaches can insert courses" ON public.courses;
CREATE POLICY "Coaches can insert courses"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'coach')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Also allow super_admin to update/delete any course (not only own),
-- while coaches still manage only their own.
DROP POLICY IF EXISTS "Coaches can update own courses" ON public.courses;
CREATE POLICY "Coaches can update own courses"
  ON public.courses FOR UPDATE TO authenticated
  USING (
    coach_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    coach_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Coaches can delete own courses" ON public.courses;
CREATE POLICY "Coaches can delete own courses"
  ON public.courses FOR DELETE TO authenticated
  USING (
    coach_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Sections: FOR ALL needs WITH CHECK for INSERT; also allow super_admin/admin
DROP POLICY IF EXISTS "Coaches can manage sections" ON public.sections;
CREATE POLICY "Coaches can manage sections"
  ON public.sections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id
        AND (
          coach_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id
        AND (
          coach_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'super_admin')
        )
    )
  );

-- Chapters: same fix
DROP POLICY IF EXISTS "Coaches can manage chapters" ON public.chapters;
CREATE POLICY "Coaches can manage chapters"
  ON public.chapters FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sections s
      JOIN public.courses c ON c.id = s.course_id
      WHERE s.id = section_id
        AND (
          c.coach_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sections s
      JOIN public.courses c ON c.id = s.course_id
      WHERE s.id = section_id
        AND (
          c.coach_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'super_admin')
        )
    )
  );
