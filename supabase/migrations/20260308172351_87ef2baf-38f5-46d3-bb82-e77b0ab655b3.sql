
-- Create a security definer function to check community membership (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE user_id = _user_id AND community_id = _community_id
  )
$$;

-- Create a function to get community role (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.get_community_role(_user_id uuid, _community_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.community_members
  WHERE user_id = _user_id AND community_id = _community_id
  LIMIT 1
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Members can view community members" ON public.community_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.community_members;

-- Recreate with non-recursive policies
CREATE POLICY "Members can view community members"
ON public.community_members FOR SELECT TO authenticated
USING (
  is_community_member(auth.uid(), community_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owners can manage members"
ON public.community_members FOR UPDATE TO authenticated
USING (
  get_community_role(auth.uid(), community_id) = 'owner'
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Owners can delete members"
ON public.community_members FOR DELETE TO authenticated
USING (
  get_community_role(auth.uid(), community_id) = 'owner'
  OR has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() = user_id
);
