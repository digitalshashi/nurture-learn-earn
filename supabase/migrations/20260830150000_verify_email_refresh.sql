-- Diagnostic: name any stock template row that did not take the redesign.
--
-- Ran once to find out which rows the refresh had missed. It named
-- welcome_user, a legacy key nothing sends; 20260830160000 turns the same
-- check into an assertion that fails the push if a row is ever left behind.
DO $$
DECLARE
  stale text;
BEGIN
  SELECT string_agg(template_key, ', ') INTO stale
  FROM public.email_templates
  WHERE coach_id IS NULL
    AND template_key <> 'login_otp'
    AND body_html NOT LIKE '%height:4px;line-height:4px;font-size:0;background-color:%';

  RAISE NOTICE 'not refreshed: %', coalesce(stale, '(none)');
END $$;
