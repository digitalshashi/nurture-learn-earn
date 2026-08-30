-- Proves no policy still hands every course to every account.
--
-- The three that did were easy to miss because each looked deliberate:
-- "Anyone can view published courses" reads like a feature, and USING (true)
-- on sections and chapters reads like it was never finished.

DO $$
DECLARE
  wide record;
  found integer := 0;
BEGIN
  FOR wide IN
    SELECT tablename, policyname, qual::text AS using_clause
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('courses', 'sections', 'chapters')
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY (roles)
  LOOP
    -- A SELECT policy that mentions neither the viewer nor an entitlement is
    -- open to everyone who can log in.
    IF wide.using_clause = 'true'
       OR (wide.using_clause NOT LIKE '%auth.uid()%')
       OR (wide.using_clause LIKE '%is_published%' AND wide.using_clause NOT LIKE '%has_course_access%')
    THEN
      RAISE WARNING 'Open policy: %.% -> %', wide.tablename, wide.policyname, wide.using_clause;
      found := found + 1;
    END IF;
  END LOOP;

  IF found > 0 THEN
    RAISE EXCEPTION '% course policies still readable by any signed-in account.', found;
  END IF;

  -- And the entitlement helper must actually be restrictive: a random person
  -- with no enrolment and no purchase holds nothing.
  IF public.has_course_access(
       '00000000-0000-0000-0000-000000000000',
       '00000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'has_course_access granted a course to a stranger.';
  END IF;

  RAISE NOTICE 'Courses, sections and chapters are scoped to owners, staff and entitled learners.';
END $$;
