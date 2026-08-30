-- A real sales ledger.
--
-- Money was only ever recorded as a side effect of granting access:
-- service_users.amount_paid. That cannot express a refund, a payout, or a
-- failed charge, and the Sales pages showed hardcoded sample rows because
-- there was nothing to read. These two tables are the source of truth.

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  user_id uuid,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,

  -- 'sale' adds to earnings, 'refund' subtracts. Kept as text with a check so
  -- a new kind is a code change rather than an enum migration.
  type text NOT NULL DEFAULT 'sale' CHECK (type IN ('sale', 'refund')),
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),

  -- Stored as the smallest sensible decimal rather than an integer of paise:
  -- the rest of the app already treats service prices as numeric.
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',

  gateway text,
  gateway_txn_id text,

  customer_name text,
  customer_email text,
  item_name text,

  notes text,
  metadata jsonb,

  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_coach_time_idx
  ON public.transactions (coach_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS transactions_user_idx ON public.transactions (user_id);

-- One row per gateway payment: a repeated webhook or a double-clicked
-- confirmation must not book the same sale twice.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_gateway_txn_uniq
  ON public.transactions (gateway, gateway_txn_id)
  WHERE gateway_txn_id IS NOT NULL;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches read own transactions" ON public.transactions;
CREATE POLICY "Coaches read own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

-- Manual entries and imports; gateway sales are written by the service role.
DROP POLICY IF EXISTS "Coaches write own transactions" ON public.transactions;
CREATE POLICY "Coaches write own transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coaches update own transactions" ON public.transactions;
CREATE POLICY "Coaches update own transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all transactions" ON public.transactions;
CREATE POLICY "Admins manage all transactions"
  ON public.transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ------------------------------------------------------------ withdrawals --

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'processing', 'paid', 'rejected')),
  method text,
  destination text,
  reference text,
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS withdrawals_coach_time_idx
  ON public.withdrawals (coach_id, requested_at DESC);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches read own withdrawals" ON public.withdrawals;
CREATE POLICY "Coaches read own withdrawals"
  ON public.withdrawals FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

-- A coach may only ever create a request. Moving it to paid is an admin
-- action, so a coach cannot mark their own payout complete.
DROP POLICY IF EXISTS "Coaches request own withdrawals" ON public.withdrawals;
CREATE POLICY "Coaches request own withdrawals"
  ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid() AND status = 'requested');

DROP POLICY IF EXISTS "Admins manage all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins manage all withdrawals"
  ON public.withdrawals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.touch_withdrawals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawals_touch ON public.withdrawals;
CREATE TRIGGER withdrawals_touch BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.touch_withdrawals();

-- --------------------------------------------------------------- backfill --
-- Every past purchase becomes a sale, so the Sales pages have real history
-- from day one instead of starting empty.
INSERT INTO public.transactions
  (coach_id, user_id, service_id, type, status, amount, currency,
   gateway, gateway_txn_id, customer_name, customer_email, item_name, occurred_at)
SELECT
  s.coach_id,
  su.user_id,
  su.service_id,
  'sale',
  'completed',
  COALESCE(su.amount_paid, 0),
  COALESCE(s.currency, 'INR'),
  COALESCE(su.payment_method, 'unknown'),
  su.transaction_id,
  p.full_name,
  p.email,
  s.title,
  su.purchased_at
FROM public.service_users su
JOIN public.services s ON s.id = su.service_id
LEFT JOIN public.profiles p ON p.id = su.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.transactions t
  WHERE t.gateway_txn_id IS NOT NULL
    AND t.gateway_txn_id = su.transaction_id
);

-- Net earnings, available balance and payout totals in one place, so every
-- page agrees on the numbers instead of each recomputing them.
CREATE OR REPLACE VIEW public.coach_sales_summary AS
SELECT
  t.coach_id,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'sale' AND t.status = 'completed'), 0) AS gross_sales,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'refund'), 0) AS total_refunded,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'sale' AND t.status = 'completed'), 0)
    - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'refund'), 0) AS net_earnings,
  COUNT(*) FILTER (WHERE t.type = 'sale' AND t.status = 'completed') AS sale_count,
  COUNT(*) FILTER (WHERE t.type = 'refund') AS refund_count
FROM public.transactions t
GROUP BY t.coach_id;

GRANT SELECT ON public.coach_sales_summary TO authenticated;
