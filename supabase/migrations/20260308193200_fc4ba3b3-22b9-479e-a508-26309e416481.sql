
-- Login sessions table
CREATE TABLE public.login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device text DEFAULT '',
  browser text DEFAULT '',
  os text DEFAULT '',
  ip_address text DEFAULT '',
  location text DEFAULT '',
  last_active timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.login_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own sessions" ON public.login_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches view all sessions" ON public.login_sessions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

-- Reported content table
CREATE TABLE public.reported_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  content_type text NOT NULL DEFAULT 'post',
  content_id uuid NOT NULL,
  reason text DEFAULT '',
  description text DEFAULT '',
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  action_taken text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.reported_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report content" ON public.reported_content
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Coaches can view reports" ON public.reported_content
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches can update reports" ON public.reported_content
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

-- Blocked users table
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,
  reason text DEFAULT '',
  blocked_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage blocked users" ON public.blocked_users
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));
