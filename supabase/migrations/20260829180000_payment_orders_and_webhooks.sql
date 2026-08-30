-- Payment orders, and the credentials a webhook needs to prove itself.
--
-- Until now an intent to pay left no trace: the only record of a payment was
-- the service_users row written *after* the browser came back and verified.
-- That has two consequences worth fixing together.
--
-- 1. If the buyer closes the tab between paying and returning, the money is
--    captured and nothing is granted. The fix is a server-to-server webhook,
--    but a webhook arrives with only a gateway id in hand — it needs a record
--    saying which service, which buyer and which price that id stood for.
-- 2. Nothing could distinguish "never tried" from "tried and the card failed",
--    so abandoned and failed checkouts were invisible.
--
-- payment_orders is that record, written when the order is created.

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  coach_id uuid NOT NULL,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  provider text NOT NULL CHECK (provider IN ('razorpay', 'instamojo')),

  -- Razorpay order id, or Instamojo payment_request id. The gateway hands this
  -- back on both the browser return trip and the webhook, so it is the join
  -- key between an intent and its outcome.
  gateway_order_id text NOT NULL,
  -- Set once a payment actually attaches to the order.
  gateway_payment_id text,

  -- The price at the moment the order was created. Verification compares the
  -- captured amount against this, so a service repriced mid-checkout cannot
  -- turn into an under- or over-charge dispute.
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',

  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  failure_reason text,

  -- Carried through fulfilment: a webhook has no browser to read these from.
  custom_fields_data jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

-- The join key must be unique per provider, or a webhook could not resolve a
-- single order from the id it was given.
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_gateway_order_uniq
  ON public.payment_orders (provider, gateway_order_id);

CREATE INDEX IF NOT EXISTS payment_orders_coach_time_idx
  ON public.payment_orders (coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_orders_user_idx
  ON public.payment_orders (user_id, created_at DESC);
-- Used by the replay guard, which asks whether a payment id was already spent.
CREATE INDEX IF NOT EXISTS payment_orders_gateway_payment_idx
  ON public.payment_orders (provider, gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Rows are written only by the edge functions under the service role. Nobody
-- else may insert: a client-created "order" would be a forged intent that a
-- later webhook would happily fulfil.
DROP POLICY IF EXISTS "Buyers read own payment orders" ON public.payment_orders;
CREATE POLICY "Buyers read own payment orders"
  ON public.payment_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Coaches read own payment orders" ON public.payment_orders;
CREATE POLICY "Coaches read own payment orders"
  ON public.payment_orders FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all payment orders" ON public.payment_orders;
CREATE POLICY "Admins read all payment orders"
  ON public.payment_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.touch_payment_orders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_orders_touch ON public.payment_orders;
CREATE TRIGGER payment_orders_touch BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_payment_orders();

-- ------------------------------------------------------- webhook secret ----
-- Razorpay signs webhooks with a secret set in its dashboard, which is a
-- different value from the API key secret and cannot be derived from it.
-- Instamojo signs with the private salt, which already has a column.
ALTER TABLE public.coach_payment_gateways
  ADD COLUMN IF NOT EXISTS webhook_secret text;

-- Same rule as every other credential: the browser may set it and may ask
-- whether one exists, but can never read it back.
ALTER TABLE public.coach_payment_gateways
  ADD COLUMN IF NOT EXISTS has_webhook_secret boolean
  GENERATED ALWAYS AS (webhook_secret IS NOT NULL AND length(webhook_secret) > 0) STORED;

GRANT SELECT (has_webhook_secret) ON public.coach_payment_gateways TO authenticated;

-- The salt is a signing secret too; it was readable, which let anyone with the
-- coach's session forge an Instamojo webhook. Take it back.
REVOKE SELECT (salt) ON public.coach_payment_gateways FROM authenticated;

ALTER TABLE public.coach_payment_gateways
  ADD COLUMN IF NOT EXISTS has_salt boolean
  GENERATED ALWAYS AS (salt IS NOT NULL AND length(salt) > 0) STORED;

GRANT SELECT (has_salt) ON public.coach_payment_gateways TO authenticated;

-- --------------------------------------------------- refunds on services ---
-- A refund webhook has to withdraw access, which needs a status the rest of
-- the app already understands. service_users.status is free text with
-- 'refunded' documented as a value, so nothing schema-side is needed here.
