
CREATE TABLE public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  openai_api_key text,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 3000,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own ai settings"
  ON public.ai_settings FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
