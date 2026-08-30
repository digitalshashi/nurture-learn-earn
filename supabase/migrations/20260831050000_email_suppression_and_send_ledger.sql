-- Stop the platform mailing people who don't want it, and stop it mailing the
-- same person the same thing twice.
--
-- Two gaps this closes:
--
--   1. email_unsubscribed existed, but only the broadcast composer in the app
--      ever read it. Every automated email — reminders, digests, nudges — went
--      through send-templated-email, which had never heard of the table. So a
--      learner could unsubscribe, watch it appear in the coach's "Unsubscribed
--      Users" list, and keep receiving everything the automations sent. That is
--      the behaviour a recipient reports as spam, and enough of those reports
--      is exactly why mail starts landing in the spam folder.
--
--   2. coach_id was NOT NULL, so there was no way to record "this person wants
--      nothing from this platform at all". On a white-label install a learner
--      may belong to several tenants; opting out of one must not silence the
--      others, but opting out of everything has to be expressible too. A NULL
--      coach_id is now that platform-wide scope.

-- --------------------------------------------------------------- suppression

ALTER TABLE public.email_unsubscribed ALTER COLUMN coach_id DROP NOT NULL;

-- Fold what is already stored to lowercase.
--
-- The send path normalises an address before comparing it, but rows added by
-- hand through the Unsubscribed Users screen were stored exactly as pasted. A
-- row reading "Person@Example.com" therefore never matched, and the person kept
-- receiving mail they had explicitly asked to stop — the failure this whole
-- migration exists to fix, hiding inside the table meant to prevent it.
--
-- Duplicates that differ only by case collapse into one. The earliest opt-out
-- wins: that is when the person actually asked.
DELETE FROM public.email_unsubscribed a
USING public.email_unsubscribed b
WHERE a.id <> b.id
  AND lower(a.email) = lower(b.email)
  AND a.coach_id IS NOT DISTINCT FROM b.coach_id
  AND (a.unsubscribed_at, a.id) > (b.unsubscribed_at, b.id);

UPDATE public.email_unsubscribed SET email = lower(email) WHERE email <> lower(email);

-- The table's UNIQUE(coach_id, email) does not constrain the new rows: in
-- Postgres two NULLs are distinct, so it would happily hold the same address
-- ten times platform-wide. A partial index covers that scope, and matches
-- lower(email) because addresses are compared case-insensitively everywhere
-- else in the send path.
CREATE UNIQUE INDEX IF NOT EXISTS email_unsubscribed_platform_email_idx
  ON public.email_unsubscribed (lower(email))
  WHERE coach_id IS NULL;

-- The suppression check runs before every non-transactional send, keyed on the
-- address. Without this it is a sequential scan on the hot path.
CREATE INDEX IF NOT EXISTS email_unsubscribed_email_idx
  ON public.email_unsubscribed (lower(email));

-- The existing policy is `coach_id = auth.uid()`, which is NULL-safe in the
-- wrong direction: NULL = uid() is NULL, not false, so platform-wide rows are
-- invisible to everyone and editable by no one. Service-role writes bypass RLS
-- so the unsubscribe endpoint still works, but an admin needs to see them.
CREATE POLICY "Admins manage platform unsubscribes" ON public.email_unsubscribed FOR ALL
  USING (coach_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (coach_id IS NULL AND public.has_role(auth.uid(), 'admin'));

-- -------------------------------------------------------------- send ledger

-- Every send, recorded at the choke point, for two jobs: idempotency and a
-- frequency cap.
CREATE TABLE IF NOT EXISTS public.email_send_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template_key text NOT NULL,
  coach_id uuid,
  -- Names the occasion, not the message: "event-reminder:<event>:<user>".
  -- NULL means the caller had nothing stable to key on, so this row counts
  -- toward the cap but never suppresses a later send.
  dedupe_key text,
  is_transactional boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- The idempotency guarantee. A retried webhook or an overlapping cron run
-- loses the race here rather than putting a second copy in an inbox.
CREATE UNIQUE INDEX IF NOT EXISTS email_send_ledger_dedupe_idx
  ON public.email_send_ledger (lower(recipient), template_key, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Supports "how much has this address had from us in the last 24 hours".
CREATE INDEX IF NOT EXISTS email_send_ledger_recipient_sent_idx
  ON public.email_send_ledger (lower(recipient), sent_at DESC);

ALTER TABLE public.email_send_ledger ENABLE ROW LEVEL SECURITY;

-- Written only by the service role inside send-templated-email. Coaches may
-- read their own workspace's rows to see what actually went out.
CREATE POLICY "Coaches read own send ledger" ON public.email_send_ledger FOR SELECT
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- The ledger is a rolling window for rate limiting, not an archive; email_logs
-- is the durable record. Trimming keeps the cap query fast.
CREATE OR REPLACE FUNCTION public.prune_email_send_ledger()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.email_send_ledger WHERE sent_at < now() - interval '30 days';
$$;
