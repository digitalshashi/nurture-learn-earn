
CREATE TABLE public.zoom_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  zoom_account_id text,
  zoom_client_id text,
  zoom_client_secret text,
  is_connected boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zoom_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own zoom settings"
  ON public.zoom_settings
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
