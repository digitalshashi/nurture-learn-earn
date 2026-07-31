
-- Team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  country text DEFAULT '',
  avatar_url text,
  role text NOT NULL DEFAULT 'restricted',
  permissions text[] DEFAULT '{}',
  invited_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own team" ON public.team_members
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Cloud files table
CREATE TABLE public.cloud_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_size bigint DEFAULT 0,
  file_type text DEFAULT '',
  mime_type text DEFAULT '',
  created_at timestamp with time zone DEFAULT now(),
  last_restored_at timestamp with time zone
);

ALTER TABLE public.cloud_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own files" ON public.cloud_files
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
