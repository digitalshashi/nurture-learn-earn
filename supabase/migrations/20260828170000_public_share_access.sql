-- Public read access for the pages that exist to be shared.
--
-- `/checkout/:slug` and `/workshop/:slug` are unauthenticated routes — that is
-- the whole point of them; they are the links coaches paste into WhatsApp and
-- Instagram. But `services` only ever had a `TO authenticated` select policy,
-- so a logged-out visitor following a shared product link got "Service Not
-- Found", and the edge Worker that renders the link's social preview (it
-- queries with the same anon key) had nothing to describe either.
--
-- This grants anon exactly what a signed-in visitor could already see on those
-- public pages, and nothing more:
--   * services      — only rows already marked `status = 'active'`
--   * service_courses / courses — only what an active service links to, and
--     only the columns a listing needs
--
-- `landing_pages` already had an anon policy, so workshop pages were fine.

-- ---------------------------------------------------------------------------
-- services: the product page itself
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;

CREATE POLICY "Anyone can view active services"
  ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- ---------------------------------------------------------------------------
-- service_courses: "what you get" on the checkout page
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "View service courses for active services" ON public.service_courses;

CREATE POLICY "View service courses for active services"
  ON public.service_courses
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_courses.service_id AND s.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- courses: title and artwork only, and only for published courses
-- ---------------------------------------------------------------------------
-- A column-level grant rather than a whole-row one: the checkout page and the
-- share preview need a name and a thumbnail, while drip schedules, DRM flags
-- and access levels are the coach's business. Supabase grants SELECT on every
-- public table to anon by default, so the revoke has to come first for the
-- narrower grant to mean anything.
REVOKE SELECT ON public.courses FROM anon;
GRANT SELECT (
  id,
  title,
  description,
  thumbnail_url,
  cover_image_url,
  category,
  price,
  coach_id,
  is_published
) ON public.courses TO anon;

DROP POLICY IF EXISTS "Anon can view published courses" ON public.courses;

CREATE POLICY "Anon can view published courses"
  ON public.courses
  FOR SELECT
  TO anon
  USING (is_published = true);
