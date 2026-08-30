-- Per-coach, multi-provider AI configuration.
--
-- ai_settings held exactly one OpenAI key in fixed columns, so a coach could
-- not use Anthropic, Gemini, DeepSeek or a self-hosted endpoint, and every
-- generated asset had to be text. This adds one credential row per provider
-- and lets the coach nominate a different model per capability
-- (text / image / video).
--
-- Secrets follow the rule established in the RLS hardening migration:
-- write-only from the browser. The client may save a key and may ask whether
-- one is configured, but can never read it back. Edge functions read the key
-- with the service role, which bypasses both RLS and column privileges.

CREATE TABLE IF NOT EXISTS public.ai_provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  provider text NOT NULL CHECK (
    provider IN ('openai', 'anthropic', 'gemini', 'deepseek', 'xiaomi', 'custom')
  ),

  -- Display name. Blank for the built-in providers (there is one of each);
  -- required for 'custom', where it also distinguishes several endpoints.
  label text NOT NULL DEFAULT '',

  api_key text,

  -- Where to send requests. Prefilled from the provider registry but always
  -- editable, so a coach can point a provider at a proxy or a regional host.
  base_url text,

  -- Which request/response shape the endpoint speaks. Fixed for the built-in
  -- providers; chosen by the coach for 'custom'.
  api_style text NOT NULL DEFAULT 'openai'
    CHECK (api_style IN ('openai', 'anthropic', 'gemini')),

  -- Route overrides and auth details for endpoints that do not follow the
  -- usual paths: { chat_path, image_path, video_path, video_status_path,
  -- auth_header, auth_scheme, extra_headers }.
  config jsonb NOT NULL DEFAULT '{}'::jsonb,

  is_enabled boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (coach_id, provider, label)
);

-- Lets the client ask "is a key set?" without being able to read it.
ALTER TABLE public.ai_provider_credentials
  ADD COLUMN IF NOT EXISTS has_api_key boolean
  GENERATED ALWAYS AS (api_key IS NOT NULL AND length(api_key) > 0) STORED;

CREATE INDEX IF NOT EXISTS ai_provider_credentials_coach_idx
  ON public.ai_provider_credentials (coach_id);

ALTER TABLE public.ai_provider_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage own ai credentials" ON public.ai_provider_credentials;
CREATE POLICY "Coaches manage own ai credentials"
  ON public.ai_provider_credentials
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all ai credentials" ON public.ai_provider_credentials;
CREATE POLICY "Admins manage all ai credentials"
  ON public.ai_provider_credentials
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

REVOKE SELECT ON public.ai_provider_credentials FROM anon, authenticated;
GRANT SELECT (
  id, coach_id, provider, label, base_url, api_style, config,
  is_enabled, has_api_key, created_at, updated_at
) ON public.ai_provider_credentials TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ai_provider_credentials TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_ai_provider_credentials()
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

DROP TRIGGER IF EXISTS ai_provider_credentials_touch ON public.ai_provider_credentials;
CREATE TRIGGER ai_provider_credentials_touch
  BEFORE UPDATE ON public.ai_provider_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_provider_credentials();

-- ------------------------------------------------ per-capability defaults ---
-- ai_settings stays the coach's single row of "what should run by default",
-- but the model now comes with the credential it should be called through,
-- and text is no longer the only thing that can be generated.

ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS text_credential_id uuid
    REFERENCES public.ai_provider_credentials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS text_model text,
  ADD COLUMN IF NOT EXISTS image_credential_id uuid
    REFERENCES public.ai_provider_credentials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_model text,
  ADD COLUMN IF NOT EXISTS video_credential_id uuid
    REFERENCES public.ai_provider_credentials(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_model text;

-- The hardening migration replaced the blanket SELECT with a column list, so
-- the new columns have to be granted explicitly or the browser cannot read
-- back which model it picked. openai_api_key stays off the list.
REVOKE SELECT ON public.ai_settings FROM anon, authenticated;
GRANT SELECT (
  id, coach_id, model, temperature, max_tokens, has_openai_key,
  text_credential_id, text_model,
  image_credential_id, image_model,
  video_credential_id, video_model,
  created_at, updated_at
) ON public.ai_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ai_settings TO authenticated;

-- ------------------------------------------------------------- backfill ----
-- Carry the existing OpenAI key over as a credential so no coach has to
-- re-enter it, and point the text default at it.
INSERT INTO public.ai_provider_credentials
  (coach_id, provider, label, api_key, base_url, api_style, is_enabled)
SELECT
  s.coach_id,
  'openai',
  '',
  s.openai_api_key,
  'https://api.openai.com/v1',
  'openai',
  true
FROM public.ai_settings s
WHERE s.openai_api_key IS NOT NULL
  AND length(s.openai_api_key) > 0
ON CONFLICT (coach_id, provider, label) DO NOTHING;

UPDATE public.ai_settings s
SET text_credential_id = c.id,
    text_model = COALESCE(s.text_model, s.model)
FROM public.ai_provider_credentials c
WHERE c.coach_id = s.coach_id
  AND c.provider = 'openai'
  AND c.label = ''
  AND s.text_credential_id IS NULL;

-- Admins configure AI on a coach's behalf from the same screen, so ai_settings
-- needs the admin policy its credentials table already has.
DROP POLICY IF EXISTS "Admins manage all ai settings" ON public.ai_settings;
CREATE POLICY "Admins manage all ai settings"
  ON public.ai_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
