
-- Create role_permissions table to store feature toggles per role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, feature_key)
);

-- Create permission_audit_log table
CREATE TABLE public.permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  feature_key text NOT NULL,
  old_value boolean,
  new_value boolean NOT NULL,
  changed_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone authenticated can read permissions (needed for UI filtering)
CREATE POLICY "Authenticated users can read permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

-- RLS: Only admins can modify permissions
CREATE POLICY "Admins can manage permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Authenticated can read audit log
CREATE POLICY "Authenticated can read audit log"
  ON public.permission_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can insert audit log
CREATE POLICY "Admins can insert audit log"
  ON public.permission_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default permissions for each role
-- Student defaults
INSERT INTO public.role_permissions (role, feature_key, enabled) VALUES
  ('student', 'community_feed', true),
  ('student', 'messages', true),
  ('student', 'channels', true),
  ('student', 'leaderboard', true),
  ('student', 'events', true),
  ('student', 'courses', true),
  ('student', 'workshops', false),
  ('student', 'services', false),
  ('student', 'dashboard', false),
  ('student', 'analytics', false),
  ('student', 'sales', false),
  ('student', 'page_builder', false),
  ('student', 'crm', false),
  ('student', 'customers', false),
  ('student', 'marketing', false),
  ('student', 'automation', false),
  ('student', 'partnerships', false),
  ('student', 'affiliate', false),
  ('student', 'gamification', false),
  ('student', 'levelup', true),
  ('student', 'ai_suite', false),
  ('student', 'platform_settings', false),
  ('student', 'security_settings', false),
  ('student', 'team_management', false),
  ('student', 'cloud_storage', false),
  ('student', 'billing', false),
  ('student', 'referral', false),
  ('student', 'certificates', true),
  ('student', 'quest', true),
  ('student', 'create_post', true),
  ('student', 'create_channels', false),
  ('student', 'my_settings', true);

-- Coach defaults
INSERT INTO public.role_permissions (role, feature_key, enabled) VALUES
  ('coach', 'community_feed', true),
  ('coach', 'messages', true),
  ('coach', 'channels', true),
  ('coach', 'leaderboard', true),
  ('coach', 'events', true),
  ('coach', 'courses', true),
  ('coach', 'workshops', true),
  ('coach', 'services', true),
  ('coach', 'dashboard', true),
  ('coach', 'analytics', true),
  ('coach', 'sales', true),
  ('coach', 'page_builder', true),
  ('coach', 'crm', true),
  ('coach', 'customers', true),
  ('coach', 'marketing', true),
  ('coach', 'automation', true),
  ('coach', 'partnerships', true),
  ('coach', 'affiliate', true),
  ('coach', 'gamification', true),
  ('coach', 'levelup', true),
  ('coach', 'ai_suite', true),
  ('coach', 'platform_settings', true),
  ('coach', 'security_settings', true),
  ('coach', 'team_management', true),
  ('coach', 'cloud_storage', true),
  ('coach', 'billing', true),
  ('coach', 'referral', true),
  ('coach', 'certificates', true),
  ('coach', 'quest', true),
  ('coach', 'create_post', true),
  ('coach', 'create_channels', true),
  ('coach', 'my_settings', true);

-- Admin defaults (same as coach but all on)
INSERT INTO public.role_permissions (role, feature_key, enabled) VALUES
  ('admin', 'community_feed', true),
  ('admin', 'messages', true),
  ('admin', 'channels', true),
  ('admin', 'leaderboard', true),
  ('admin', 'events', true),
  ('admin', 'courses', true),
  ('admin', 'workshops', true),
  ('admin', 'services', true),
  ('admin', 'dashboard', true),
  ('admin', 'analytics', true),
  ('admin', 'sales', true),
  ('admin', 'page_builder', true),
  ('admin', 'crm', true),
  ('admin', 'customers', true),
  ('admin', 'marketing', true),
  ('admin', 'automation', true),
  ('admin', 'partnerships', true),
  ('admin', 'affiliate', true),
  ('admin', 'gamification', true),
  ('admin', 'levelup', true),
  ('admin', 'ai_suite', true),
  ('admin', 'platform_settings', true),
  ('admin', 'security_settings', true),
  ('admin', 'team_management', true),
  ('admin', 'cloud_storage', true),
  ('admin', 'billing', true),
  ('admin', 'referral', true),
  ('admin', 'certificates', true),
  ('admin', 'quest', true),
  ('admin', 'create_post', true),
  ('admin', 'create_channels', true),
  ('admin', 'my_settings', true);
