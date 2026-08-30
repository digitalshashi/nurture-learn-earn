-- Security hardening: close two paywall bypasses and stop leaking member PII.
--
-- 1) service_users: "Users can purchase services" allowed any authenticated
--    user to INSERT a row for themselves against ANY service_id. Access to a
--    paid service could be self-granted from the browser console with no
--    payment. Self-insert is now limited to genuinely free services; paid
--    grants must come from verify-razorpay-payment, which uses the service
--    role and therefore bypasses RLS.
--
-- 2) enrollments: "Users can enroll" had the same shape, so any user could
--    enrol themselves into any course, including paid ones.
--
-- 3) profiles: "Public can view profiles" was USING (true) for the anon role,
--    exposing every member's email to anyone holding the publishable key —
--    which ships in the client bundle, so effectively to the public internet.
--    Verified against the live project: an unauthenticated GET on
--    /rest/v1/profiles returned rows, and select=email returned 200.
--    The row policy has to stay, because /checkout/:idOrSlug is a public route
--    that shows the coach's name, so this is fixed with column privileges
--    instead: anon keeps only the three columns that page needs.

-- ---------------------------------------------------------------- services --
DROP POLICY IF EXISTS "Users can purchase services" ON public.service_users;

DROP POLICY IF EXISTS "Users can join free services" ON public.service_users;
CREATE POLICY "Users can join free services"
  ON public.service_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.services s
      WHERE s.id = service_users.service_id
        AND (s.is_free = true OR COALESCE(s.discounted_price, s.price) <= 0)
    )
  );

-- ------------------------------------------------------------- enrollments --
DROP POLICY IF EXISTS "Users can enroll" ON public.enrollments;

DROP POLICY IF EXISTS "Users can enrol in free courses" ON public.enrollments;
CREATE POLICY "Users can enrol in free courses"
  ON public.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = enrollments.course_id
        AND COALESCE(c.price, 0) <= 0
    )
  );

-- ---------------------------------------------------------------- profiles --
-- The row-level policy is deliberately left in place: the public checkout page
-- reads the coach's full_name while signed out. Column privileges do the
-- narrowing, so anon can no longer read email.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url) ON public.profiles TO anon;

-- Signed-in members still need the full row for the feed, comments,
-- leaderboard, messaging and account screens.
GRANT SELECT ON public.profiles TO authenticated;

-- ------------------------------------------------ payment gateway secrets --
-- SettingsPage did select("*") on this table, so the Razorpay key secret was
-- delivered to the browser on every visit and held in component state. RLS
-- limited that to the owning coach, so it was not cross-tenant — but a gateway
-- secret should never leave the server. Any XSS on that page would have lifted
-- it. The client only needs to know whether a secret is configured.
ALTER TABLE public.coach_payment_settings
  ADD COLUMN IF NOT EXISTS has_razorpay_secret boolean
  GENERATED ALWAYS AS (
    razorpay_key_secret IS NOT NULL AND length(razorpay_key_secret) > 0
  ) STORED;

-- Write-only from the client: it can still be saved, never read back.
REVOKE SELECT ON public.coach_payment_settings FROM authenticated;
GRANT SELECT (
  id, coach_id, razorpay_key_id, default_currency, has_razorpay_secret,
  created_at, updated_at
) ON public.coach_payment_settings TO authenticated;

-- Same reasoning for the stored OpenAI key.
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS has_openai_key boolean
  GENERATED ALWAYS AS (
    openai_api_key IS NOT NULL AND length(openai_api_key) > 0
  ) STORED;

REVOKE SELECT ON public.ai_settings FROM authenticated;
GRANT SELECT (
  id, coach_id, model, temperature, max_tokens, has_openai_key,
  created_at, updated_at
) ON public.ai_settings TO authenticated;
