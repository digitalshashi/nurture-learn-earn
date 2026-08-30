-- Per-coach, multi-provider payment gateway configuration.
--
-- coach_payment_settings held exactly one gateway (Razorpay) in fixed columns,
-- so a coach could not run Instamojo, and adding a provider meant a schema
-- change. This replaces it with one row per (coach, provider).
--
-- Secrets follow the same rule established in the RLS hardening migration:
-- write-only from the browser. The client may save a key/secret and may ask
-- whether one is configured, but can never read it back.

CREATE TABLE IF NOT EXISTS public.coach_payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('razorpay', 'instamojo')),

  -- Razorpay: key_id / key_secret.
  -- Instamojo: api_key / auth_token (same two slots, provider decides meaning).
  key_id text,
  key_secret text,
  -- Instamojo webhook signing salt. Unused by Razorpay.
  salt text,

  environment text NOT NULL DEFAULT 'live' CHECK (environment IN ('live', 'test')),
  currency text NOT NULL DEFAULT 'INR',

  is_enabled boolean NOT NULL DEFAULT true,
  -- Which gateway the checkout should preselect. Enforced to at most one per
  -- coach by the partial unique index below.
  is_default boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (coach_id, provider)
);

-- Lets the client ask "is a secret set?" without being able to read it.
ALTER TABLE public.coach_payment_gateways
  ADD COLUMN IF NOT EXISTS has_secret boolean
  GENERATED ALWAYS AS (key_secret IS NOT NULL AND length(key_secret) > 0) STORED;

CREATE INDEX IF NOT EXISTS coach_payment_gateways_coach_idx
  ON public.coach_payment_gateways (coach_id);

CREATE UNIQUE INDEX IF NOT EXISTS coach_payment_gateways_one_default_idx
  ON public.coach_payment_gateways (coach_id)
  WHERE is_default;

ALTER TABLE public.coach_payment_gateways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own gateways" ON public.coach_payment_gateways;
CREATE POLICY "Coaches manage own gateways"
  ON public.coach_payment_gateways
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all gateways" ON public.coach_payment_gateways;
CREATE POLICY "Admins manage all gateways"
  ON public.coach_payment_gateways
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Secrets are never selectable by the browser; the edge functions read them
-- with the service role, which bypasses both RLS and column privileges.
REVOKE SELECT ON public.coach_payment_gateways FROM anon, authenticated;
GRANT SELECT (
  id, coach_id, provider, key_id, salt, environment, currency,
  is_enabled, is_default, has_secret, created_at, updated_at
) ON public.coach_payment_gateways TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coach_payment_gateways TO authenticated;

-- Checkout runs signed-out until the buyer logs in, and needs to know which
-- gateways a coach offers. Only the non-sensitive shape is exposed.
GRANT SELECT (id, coach_id, provider, environment, currency, is_enabled, is_default)
  ON public.coach_payment_gateways TO anon;

DROP POLICY IF EXISTS "Anyone can see which gateways a coach offers" ON public.coach_payment_gateways;
CREATE POLICY "Anyone can see which gateways a coach offers"
  ON public.coach_payment_gateways
  FOR SELECT
  TO anon
  USING (is_enabled);

-- ------------------------------------------------------------- backfill ----
-- Carry existing Razorpay credentials over so no coach has to re-enter them.
INSERT INTO public.coach_payment_gateways
  (coach_id, provider, key_id, key_secret, currency, is_enabled, is_default)
SELECT
  s.coach_id,
  'razorpay',
  s.razorpay_key_id,
  s.razorpay_key_secret,
  COALESCE(s.default_currency, 'INR'),
  true,
  true
FROM public.coach_payment_settings s
WHERE s.razorpay_key_id IS NOT NULL
  AND s.razorpay_key_secret IS NOT NULL
ON CONFLICT (coach_id, provider) DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_coach_payment_gateways()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coach_payment_gateways_touch ON public.coach_payment_gateways;
CREATE TRIGGER coach_payment_gateways_touch
  BEFORE UPDATE ON public.coach_payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.touch_coach_payment_gateways();
