-- Route each kind of outgoing email to a specific sender account.
--
-- email_accounts already supported several providers per coach, but only two
-- flags decided which one sent anything: is_default and is_platform_default.
-- There was no way to say "marketing goes out from hello@, receipts from
-- billing@". This adds one row per (coach, purpose).

CREATE TABLE IF NOT EXISTS public.email_account_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  -- Kept as text rather than an enum so a new purpose is a code change, not a
  -- migration; the UI supplies the list.
  purpose text NOT NULL CHECK (
    purpose IN ('transactional', 'marketing', 'automation', 'support')
  ),
  account_id uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (coach_id, purpose)
);

CREATE INDEX IF NOT EXISTS email_account_assignments_coach_idx
  ON public.email_account_assignments (coach_id);

ALTER TABLE public.email_account_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own email routing" ON public.email_account_assignments;
CREATE POLICY "Coaches manage own email routing"
  ON public.email_account_assignments
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all email routing" ON public.email_account_assignments;
CREATE POLICY "Admins manage all email routing"
  ON public.email_account_assignments
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ------------------------------------------------ automation template edits --
-- AutomationTemplates could create and delete but never update, so a typo in a
-- template meant deleting and retyping it. Nothing schema-side blocked editing;
-- the UPDATE policy simply did not exist.
DROP POLICY IF EXISTS "Coaches update own automation templates" ON public.automation_templates;
CREATE POLICY "Coaches update own automation templates"
  ON public.automation_templates
  FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Records what a test send did, so a coach can tell "nothing arrived" from
-- "we never tried".
CREATE TABLE IF NOT EXISTS public.email_test_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  subject text,
  succeeded boolean NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_test_sends_coach_idx
  ON public.email_test_sends (coach_id, created_at DESC);

ALTER TABLE public.email_test_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches read own test sends" ON public.email_test_sends;
CREATE POLICY "Coaches read own test sends"
  ON public.email_test_sends
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());
