
-- Navigation menu items (coach-configurable)
CREATE TABLE public.navigation_menu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  icon_name text NOT NULL DEFAULT 'circle',
  link text NOT NULL DEFAULT '/',
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  visible_roles text[] NOT NULL DEFAULT ARRAY['student', 'coach', 'admin'],
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.navigation_menu ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view enabled nav items
CREATE POLICY "Authenticated can view enabled nav"
ON public.navigation_menu FOR SELECT TO authenticated
USING (is_enabled = true);

-- Coaches/admins can manage nav items
CREATE POLICY "Coaches can manage nav"
ON public.navigation_menu FOR ALL TO authenticated
USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));
