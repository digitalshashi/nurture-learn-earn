
CREATE OR REPLACE FUNCTION public.user_has_levelup_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_users su
    JOIN public.services s ON s.id = su.service_id
    WHERE su.user_id = _user_id
      AND su.status = 'active'
      AND s.enable_levelup = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    JOIN public.services s ON s.id = c.service_id
    WHERE e.user_id = _user_id
      AND s.enable_levelup = true
  )
$$;
