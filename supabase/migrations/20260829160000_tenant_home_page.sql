-- The page a white-label domain serves at its root.
--
-- A tenant's visitors land on their domain before they have an account, and
-- today that shows the platform's sign-in form. This lets the tenant design
-- what is served there instead, with the same builder that designs every other
-- page — so a white-label academy looks like its own product from the first
-- screen.

ALTER TABLE public.builder_pages
  ADD COLUMN IF NOT EXISTS is_tenant_home boolean NOT NULL DEFAULT false;

-- One home page per tenant. Their other landing pages are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS builder_pages_tenant_home_uniq
  ON public.builder_pages (coach_id) WHERE is_tenant_home;

-- The root of a tenant domain is resolved by owner, not by slug, and that
-- happens before anyone signs in — so anon needs to read the two columns the
-- lookup filters on. Both are already public elsewhere: domain_settings
-- exposes coach_id to anon so the domain can be resolved at all.
GRANT SELECT (coach_id, is_tenant_home) ON public.builder_pages TO anon;
