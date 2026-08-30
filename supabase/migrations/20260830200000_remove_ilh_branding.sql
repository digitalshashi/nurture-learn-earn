-- Take another company's name off this platform.
--
-- The Support content was pasted in from elsewhere and brought "ILH" with it,
-- in three places:
--
--   * a help topic called "ILH Community", with the slug in its own URL
--   * a resource card, "ILH Community guide", linking to that slug
--   * every certificate id, stamped 'ILH-2026-000001' by a trigger
--
-- The last one is the one that matters. Certificate ids are shown on the
-- certificate and shared — StudentCertificates offers "I earned the ...
-- certificate! ID: ..." — so every learner who has ever earned one has been
-- broadcasting a brand that is not this product's.
--
-- Ids already issued are left exactly as they are. They are identifiers people
-- have shared and may be checked against; rewriting them would break a link
-- someone put on a CV to fix a cosmetic problem for us.

-- ── Support: the help topic and the card that links to it ──────────────────

UPDATE public.support_faq_topics
SET slug  = 'community',
    title = '1corehub Community',
    updated_at = now()
WHERE slug = 'ilh-community';

-- The articles hang off the topic id, so they follow it untouched.

UPDATE public.support_stuck_resources
SET title = '1corehub Community guide',
    url   = '/support?topic=community'
WHERE url = '/support?topic=ilh-community'
   OR title = 'ILH Community guide';

-- ── Certificates: the prefix on every id issued from now on ────────────────
--
-- Neutral rather than '1CH-'. A certificate is awarded by the coach's academy,
-- not by the platform underneath it — this is white-label, and stamping our own
-- brand on someone else's certificate is the same mistake as ILH, just ours.

CREATE OR REPLACE FUNCTION public.generate_certificate_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.certificate_id := 'CERT-'
    || EXTRACT(YEAR FROM now())::text
    || '-'
    || lpad(nextval('public.certificate_id_seq')::text, 6, '0');
  RETURN NEW;
END;
$$;
