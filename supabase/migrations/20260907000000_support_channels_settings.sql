-- Add support channel columns to support_settings
ALTER TABLE public.support_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_message text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_hours text DEFAULT '',
  ADD COLUMN IF NOT EXISTS direct_chat_enabled boolean DEFAULT true;

-- Ensure authenticated members can read coach support settings to reach support
DROP POLICY IF EXISTS "Anyone authenticated can read support settings" ON public.support_settings;
CREATE POLICY "Anyone authenticated can read support settings"
  ON public.support_settings FOR SELECT TO authenticated
  USING (true);

-- Ensure coaches and admins can manage support settings
DROP POLICY IF EXISTS "Coaches manage own support settings" ON public.support_settings;
DROP POLICY IF EXISTS "Coaches and admins manage support settings" ON public.support_settings;
CREATE POLICY "Coaches and admins manage support settings"
  ON public.support_settings FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR coach_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coach')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR coach_id = auth.uid()
  );

-- Ensure support_settings is in realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_settings;
  END IF;
END $$;
