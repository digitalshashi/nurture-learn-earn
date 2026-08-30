-- Put a clock behind the scheduled emails.
--
-- notify-scheduled was deployed and secret-protected, but nothing ever called
-- it, so a reminder that was "scheduled" was simply never sent. This is the
-- scheduler.
--
-- Authentication without a secret in the repository: the database generates a
-- random token, keeps it in a table nothing but the service role can read, and
-- sends it as a header. The function reads the same row with the service role
-- and compares. Neither side needs a value written down anywhere, and rotating
-- it is one UPDATE.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.internal_secrets (
  name       text PRIMARY KEY,
  value      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on with no policies at all: every role is denied, and only the service
-- role — which bypasses RLS — can read it. The grants go too, so a future
-- policy added by accident still cannot expose the column.
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_secrets FROM anon, authenticated;

INSERT INTO public.internal_secrets (name, value)
VALUES ('notify_cron', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

-- Hourly, on the hour. The reminder windows inside the function are an hour
-- wide and matched to this: widening one without changing the other would send
-- the same reminder twice, and narrowing it would drop reminders on the floor.
SELECT cron.unschedule('notify-scheduled-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-scheduled-hourly');

SELECT cron.schedule(
  'notify-scheduled-hourly',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url     := 'https://cxaieaasrwnscshfdcbp.supabase.co/functions/v1/notify-scheduled',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', (SELECT value FROM public.internal_secrets WHERE name = 'notify_cron')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);
