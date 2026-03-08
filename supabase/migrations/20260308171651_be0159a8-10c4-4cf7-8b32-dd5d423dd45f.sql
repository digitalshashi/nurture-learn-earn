
-- Create communities table
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  brand_color text DEFAULT '#8B5CF6',
  custom_domain text UNIQUE,
  owner_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create community_members table with community-scoped roles
CREATE TYPE public.community_role AS ENUM ('owner', 'moderator', 'student', 'affiliate');

CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role community_role NOT NULL DEFAULT 'student',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Communities RLS: anyone authenticated can view active communities
CREATE POLICY "Anyone can view active communities"
  ON public.communities FOR SELECT
  USING (is_active = true);

-- Owners/admins can manage their communities
CREATE POLICY "Owners can manage own communities"
  ON public.communities FOR ALL
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Community members RLS
CREATE POLICY "Members can view community members"
  ON public.community_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Owners can manage members"
  ON public.community_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'owner'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE
  USING (auth.uid() = user_id);
