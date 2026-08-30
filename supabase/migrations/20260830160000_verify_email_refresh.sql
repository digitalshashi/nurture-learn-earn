-- Proves the refresh reached the rows, rather than trusting that it did.
--
-- The last time a template migration reported success it had matched zero rows,
-- so this asserts the outcome. Two markers, both unique to the new shell: the
-- brand stripe every template now carries, and the fixed-layout detail table
-- that stops a long transaction id overflowing its panel.
--
-- Two keys are deliberately out of scope:
--   login_otp    — refreshed by its own guarded migration, because it is the
--                  one stock row an admin edits in place.
--   welcome_user — a legacy key from an early seed, superseded by
--                  welcome_email. Nothing in the codebase references it, so it
--                  is never sent. Left in place rather than deleted: it may
--                  hold an old edit, and nothing is gained by removing it.

DO $$
DECLARE
  total     integer;
  restyled  integer;
  receipt   text;
  stale     text;
BEGIN
  SELECT count(*) INTO total
  FROM public.email_templates
  WHERE coach_id IS NULL AND template_key NOT IN ('login_otp', 'welcome_user');

  SELECT count(*) INTO restyled
  FROM public.email_templates
  WHERE coach_id IS NULL
    AND template_key NOT IN ('login_otp', 'welcome_user')
    AND body_html LIKE '%height:4px;line-height:4px;font-size:0;background-color:%';

  IF total = 0 THEN
    RAISE NOTICE 'No stock template rows exist yet; nothing to verify.';
    RETURN;
  END IF;

  IF restyled < total THEN
    SELECT string_agg(template_key, ', ') INTO stale
    FROM public.email_templates
    WHERE coach_id IS NULL
      AND template_key NOT IN ('login_otp', 'welcome_user')
      AND body_html NOT LIKE '%height:4px;line-height:4px;font-size:0;background-color:%';

    RAISE EXCEPTION 'These stock templates kept the old shell: %', stale;
  END IF;

  -- The receipt is the one that showed the overflow, so check it by name.
  SELECT body_html INTO receipt
  FROM public.email_templates
  WHERE coach_id IS NULL AND template_key = 'payment_receipt';

  IF receipt IS NOT NULL AND receipt NOT LIKE '%table-layout:fixed%' THEN
    RAISE EXCEPTION 'payment_receipt still has the overflowing detail table.';
  END IF;

  RAISE NOTICE '% stock templates carry the redesigned shell.', restyled;
END $$;
