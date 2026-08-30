-- White-label domains: an admin brings their own hostname, proves they own it,
-- and their sign-in page stops being a door into the whole platform.
--
-- domain_settings already held a hostname and a status, but nothing ever
-- checked either: the screen printed a fixed CNAME that pointed nowhere and
-- flipped the row to 'pending' forever. This adds the two records a registrar
-- actually needs, the token that proves ownership, and the membership rule the
-- scoped login is built on.

-- ------------------------------------------------------------- ownership ---

ALTER TABLE public.domain_settings
  -- Proves control of the domain. Published by the owner as a TXT record at
  -- _1corehub-verify.<domain>; secret until then, so it is never exposed to
  -- anon (see the column grants below).
  ADD COLUMN IF NOT EXISTS verification_token text
    NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  -- Where the hostname must point. Stored per row so the platform can move
  -- hosts without every coach re-reading a hardcoded string in the UI.
  ADD COLUMN IF NOT EXISTS cname_target text NOT NULL DEFAULT '1corehub.sasivanga.workers.dev',
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  -- Why the last check failed, in words the owner can act on.
  ADD COLUMN IF NOT EXISTS last_error text,
  -- Off until the owner is ready: a verified domain that is not live still
  -- serves the platform's own sign-in.
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false;

-- One hostname cannot belong to two tenants. Blank rows are the "not
-- configured yet" state and must not collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS domain_settings_domain_uniq
  ON public.domain_settings (lower(domain))
  WHERE domain IS NOT NULL AND domain <> '';

-- ------------------------------------------------------------------ RLS ---

-- The owner's own policy already exists ("Coaches manage own domain settings").
DROP POLICY IF EXISTS "Super admins manage all domains" ON public.domain_settings;
CREATE POLICY "Super admins manage all domains"
  ON public.domain_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- The sign-in page has to know whose domain it is standing on *before* anyone
-- has authenticated, so a verified, live hostname is readable by anon — but
-- only its identity, never the token that would let someone else claim it.
DROP POLICY IF EXISTS "Anyone can resolve a live domain" ON public.domain_settings;
CREATE POLICY "Anyone can resolve a live domain"
  ON public.domain_settings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'verified' AND is_live);

REVOKE SELECT ON public.domain_settings FROM anon, authenticated;
GRANT SELECT (id, coach_id, domain, status, verified_at, is_live, created_at, updated_at)
  ON public.domain_settings TO anon;
-- The owner needs the token to publish it; it stays out of anon's grant.
GRANT SELECT (
  id, coach_id, domain, status, verified_at, is_live,
  verification_token, cname_target, last_checked_at, last_error,
  created_at, updated_at
) ON public.domain_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.domain_settings TO authenticated;

-- ----------------------------------------------------------- membership ---

/*
 * Does this user belong to this tenant?
 *
 * A white-label domain is that admin's front door, so the answer decides who
 * may sign in there: the owner, their team, and the people who actually hold
 * something of theirs — a course enrolment or a purchased service.
 *
 * SECURITY DEFINER because it reads across tables the caller cannot see, and
 * it is called while deciding whether the caller should be let in at all.
 */
CREATE OR REPLACE FUNCTION public.belongs_to_tenant(_user_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- The owner is always at home on their own domain.
    _user_id = _owner_id
    -- Support has to be able to get in to fix things.
    OR public.has_role(_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.profiles p ON lower(p.email) = lower(tm.email)
      WHERE p.id = _user_id AND tm.coach_id = _owner_id AND tm.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.user_id = _user_id AND c.coach_id = _owner_id
    )
    OR EXISTS (
      SELECT 1 FROM public.service_users su
      JOIN public.services s ON s.id = su.service_id
      WHERE su.user_id = _user_id AND s.coach_id = _owner_id
    )
$$;

REVOKE ALL ON FUNCTION public.belongs_to_tenant(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.belongs_to_tenant(uuid, uuid) TO authenticated, service_role;

/*
 * May the signed-in user use this hostname?
 *
 * Answers true for any hostname that is not a live white-label domain, so the
 * platform's own address keeps working exactly as before and an unconfigured
 * tenant never locks anyone out.
 */
CREATE OR REPLACE FUNCTION public.may_use_domain(_user_id uuid, _hostname text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT public.belongs_to_tenant(_user_id, d.coach_id)
      FROM public.domain_settings d
      WHERE lower(d.domain) = lower(_hostname)
        AND d.status = 'verified'
        AND d.is_live
      LIMIT 1
    ),
    true
  )
$$;

REVOKE ALL ON FUNCTION public.may_use_domain(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.may_use_domain(uuid, text) TO authenticated, service_role;
