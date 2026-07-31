
-- Extend badges table with badge_type, icon_url, assignment_rule, created_by
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS badge_type text NOT NULL DEFAULT 'achievement';
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS icon_url text;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS assignment_rule jsonb;
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS created_by uuid;

-- User badges junction table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can read user_badges
CREATE POLICY "Anyone can view user badges" ON public.user_badges
  FOR SELECT TO authenticated USING (true);

-- Coaches/admins can insert user badges
CREATE POLICY "Coaches insert user badges" ON public.user_badges
  FOR INSERT TO authenticated WITH CHECK (true);

-- Coaches/admins can delete user badges
CREATE POLICY "Coaches delete user badges" ON public.user_badges
  FOR DELETE TO authenticated USING (true);

-- Create badge-icons storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('badge-icons', 'badge-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload badge icons
CREATE POLICY "Auth users upload badge icons" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'badge-icons');

-- Allow public reads on badge icons
CREATE POLICY "Public read badge icons" ON storage.objects
  FOR SELECT USING (bucket_id = 'badge-icons');
