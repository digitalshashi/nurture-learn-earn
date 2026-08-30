-- Make the column grants on builder_pages actually bind.
--
-- The table already carried a column-level GRANT to anon, but Supabase's
-- default privileges had also granted SELECT on the whole table, and the
-- broader grant wins. So `prompt` and `last_prompt` — a coach's private brief
-- for the page, in their own words about their own buyers — were readable by
-- anyone who asked for that column on a published page. Verified against the
-- live project: select=last_prompt returned 200 rather than a permission
-- error.
--
-- Revoke the table-wide grant and re-state the columns a visitor needs. RLS
-- still limits anon to published rows on top of this; the two are independent,
-- and the earlier grant was doing nothing.

REVOKE SELECT ON public.builder_pages FROM anon;

GRANT SELECT (
  id,
  coach_id,
  title,
  slug,
  html,
  css,
  status,
  page_type,
  service_id,
  is_tenant_home,
  meta_title,
  meta_description,
  published_at
) ON public.builder_pages TO anon;
