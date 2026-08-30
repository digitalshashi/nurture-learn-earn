-- Proves the schedule exists and the secret was generated.
--
-- A cron job that was never created looks exactly like one that runs and finds
-- nothing to do, so this asserts rather than assumes.

DO $$
DECLARE
  job_schedule text;
  job_active   boolean;
  secret_len   integer;
BEGIN
  SELECT schedule, active INTO job_schedule, job_active
  FROM cron.job WHERE jobname = 'notify-scheduled-hourly';

  IF job_schedule IS NULL THEN
    RAISE EXCEPTION 'notify-scheduled-hourly was not scheduled.';
  END IF;

  IF NOT job_active THEN
    RAISE EXCEPTION 'notify-scheduled-hourly exists but is not active.';
  END IF;

  SELECT length(value) INTO secret_len
  FROM public.internal_secrets WHERE name = 'notify_cron';

  IF coalesce(secret_len, 0) < 32 THEN
    RAISE EXCEPTION 'The cron secret is missing or too short.';
  END IF;

  RAISE NOTICE 'Scheduled "%" (active), secret is % characters.', job_schedule, secret_len;
END $$;
