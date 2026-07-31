-- Fix: RLS policies on role_permissions/permission_audit_log only checked
-- has_role(..., 'admin'), so a user with ONLY the super_admin role (no
-- separate admin row) could see the Role Permissions UI but every toggle
-- write was silently rejected by RLS. Replace with admin-OR-super_admin.

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Authenticated can read audit log" ON public.permission_audit_log;
CREATE POLICY "Authenticated can read audit log"
  ON public.permission_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can insert audit log" ON public.permission_audit_log;
CREATE POLICY "Admins can insert audit log"
  ON public.permission_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Enable realtime so permission changes propagate to already-open sessions
-- instantly instead of requiring a reload.
ALTER TABLE public.role_permissions REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'role_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
  END IF;
END $$;

-- New permissions: two ungated pages (Video Library, Navigation Settings)
-- that had no feature_key at all, so no role toggle could ever affect them.
INSERT INTO public.role_permissions (role, feature_key, enabled) VALUES
  ('student', 'video_library', true),
  ('student', 'navigation_settings', false),
  ('coach', 'video_library', true),
  ('coach', 'navigation_settings', true),
  ('admin', 'video_library', true),
  ('admin', 'navigation_settings', true)
ON CONFLICT (role, feature_key) DO NOTHING;
