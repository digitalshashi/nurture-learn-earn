-- A super admin is an admin with more, not a different thing.
--
-- The original policies were written as has_role(auth.uid(), 'admin') and
-- never mentioned super_admin, so an account holding only super_admin was
-- locked out of the screens built for it:
--
--   * user_roles  — could read only its own row, so the admin and super admin
--                   user lists rendered everyone with no roles, and changing
--                   a role silently failed
--   * saas_plans  — saw active plans only, and could not create or edit one
--   * coach_subscriptions — saw only its own
--
-- Later migrations started writing "admin OR super_admin" by hand, which fixed
-- the newer tables and left the older ones behind. Rather than restate dozens
-- of policies, the containment is expressed once here: asking whether someone
-- is an admin now also answers yes for a super admin. Policies that already
-- spell out both stay correct, just redundant.
--
-- has_role stays exact for every other role: only admin is inherited.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'super_admin')
      )
  )
$$;

-- Reading the roster is what both admin screens are for. The existing policy
-- covers it through has_role above; this makes the intent explicit and covers
-- a super admin even if the helper is ever narrowed again.
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
