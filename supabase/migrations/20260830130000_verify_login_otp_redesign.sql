-- Proves the OTP redesign actually reached the row the platform sends from.
--
-- 20260830110000 reported success and changed nothing: its WHERE compared
-- against LF newlines while the stored value carried CRLF, so it matched zero
-- rows. A migration that can no-op silently is a migration that will, so this
-- asserts the outcome instead of trusting it.
--
-- Checks a marker unique to the new layout: the code panel's class, which the
-- old design had no equivalent of.

DO $$
DECLARE
  body text;
BEGIN
  SELECT body_html INTO body
  FROM public.email_templates
  WHERE template_key = 'login_otp' AND coach_id IS NULL;

  IF body IS NULL THEN
    RAISE NOTICE 'No system login_otp row exists yet; nothing to verify.';
    RETURN;
  END IF;

  IF body LIKE '%em-code%' THEN
    RAISE NOTICE 'login_otp carries the redesigned layout.';
    RETURN;
  END IF;

  -- An admin who customised theirs keeps it, and that is not a failure.
  IF body NOT LIKE '%letter-spacing:.28em;color:#111827;">{{otp_code}}</span>%' THEN
    RAISE NOTICE 'login_otp has been customised; leaving it alone.';
    RETURN;
  END IF;

  RAISE EXCEPTION
    'login_otp still holds the old stock design — the redesign did not apply.';
END $$;
