-- Pages built in the editor, stored as the HTML/CSS they actually render.
--
-- landing_pages holds structured fields (skill, outcome, bonuses) rendered by
-- one fixed React template, so it can only ever produce that one shape of
-- page. PageBuilder itself listed three hardcoded rows and saved nothing.
-- This stores real markup, so a page can be anything.

CREATE TABLE IF NOT EXISTS public.builder_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,

  title text NOT NULL DEFAULT 'Untitled page',
  slug text NOT NULL,

  html text NOT NULL DEFAULT '',
  css text NOT NULL DEFAULT '',

  -- What the page was asked for, kept so a follow-up edit can build on the
  -- previous result instead of regenerating from nothing.
  prompt text,
  last_prompt text,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,

  meta_title text,
  meta_description text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (coach_id, slug)
);

CREATE INDEX IF NOT EXISTS builder_pages_coach_idx
  ON public.builder_pages (coach_id, updated_at DESC);

-- Published pages are looked up by slug alone from the public route.
CREATE UNIQUE INDEX IF NOT EXISTS builder_pages_published_slug_idx
  ON public.builder_pages (slug) WHERE status = 'published';

ALTER TABLE public.builder_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own pages" ON public.builder_pages;
CREATE POLICY "Coaches manage own pages"
  ON public.builder_pages FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all pages" ON public.builder_pages;
CREATE POLICY "Admins manage all pages"
  ON public.builder_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- A published page is public by definition; drafts stay private.
DROP POLICY IF EXISTS "Anyone can read published pages" ON public.builder_pages;
CREATE POLICY "Anyone can read published pages"
  ON public.builder_pages FOR SELECT TO anon, authenticated
  USING (status = 'published');

GRANT SELECT (id, title, slug, html, css, status, meta_title, meta_description, published_at)
  ON public.builder_pages TO anon;

CREATE OR REPLACE FUNCTION public.touch_builder_pages()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS builder_pages_touch ON public.builder_pages;
CREATE TRIGGER builder_pages_touch BEFORE UPDATE ON public.builder_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_builder_pages();
