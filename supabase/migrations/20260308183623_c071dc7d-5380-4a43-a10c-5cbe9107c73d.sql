
CREATE TABLE public.coach_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  razorpay_key_id text,
  razorpay_key_secret text,
  default_currency text NOT NULL DEFAULT 'INR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own payment settings"
ON public.coach_payment_settings
FOR ALL
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());
