-- Proves another company's name is gone from everything a user can see.
--
-- Asserted rather than assumed: the support seed uses ON CONFLICT, so a stale
-- row surviving an "successful" run is exactly the failure mode here.

DO $$
DECLARE
  stale_topics    integer;
  stale_resources integer;
  prefix          text;
  old_ids         integer;
BEGIN
  SELECT count(*) INTO stale_topics
  FROM public.support_faq_topics
  WHERE slug = 'ilh-community' OR title ILIKE '%ILH%';

  SELECT count(*) INTO stale_resources
  FROM public.support_stuck_resources
  WHERE title ILIKE '%ILH%' OR url ILIKE '%ilh-community%';

  IF stale_topics > 0 OR stale_resources > 0 THEN
    RAISE EXCEPTION 'ILH still appears in support content: % topics, % resources',
      stale_topics, stale_resources;
  END IF;

  -- The trigger body, as the database will actually run it.
  SELECT prosrc INTO prefix
  FROM pg_proc WHERE proname = 'generate_certificate_id';

  IF prefix IS NULL THEN
    RAISE NOTICE 'No certificate id generator on this database.';
  ELSIF prefix LIKE '%ILH-%' THEN
    RAISE EXCEPTION 'New certificates would still be stamped ILH-.';
  END IF;

  -- Certificates already issued keep their ids on purpose; report how many
  -- carry the old prefix so the number is known rather than discovered later.
  SELECT count(*) INTO old_ids
  FROM public.issued_certificates
  WHERE certificate_id LIKE 'ILH-%';

  RAISE NOTICE 'Support content is clean; new certificates use CERT-. % existing certificate ids keep the old prefix.', old_ids;
END $$;
