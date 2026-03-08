
-- Platform settings table
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  brand_name text DEFAULT '',
  product_name text DEFAULT '',
  logo_url text,
  invoice_logo_url text,
  email_logo_url text,
  favicon_url text,
  theme_color text DEFAULT '#f97316',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own platform settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Support settings table
CREATE TABLE public.support_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  sender_email text DEFAULT '',
  support_email text DEFAULT '',
  widget_enabled boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own support settings" ON public.support_settings
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Domain settings table
CREATE TABLE public.domain_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL UNIQUE,
  domain text DEFAULT '',
  status text DEFAULT 'pending',
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.domain_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own domain settings" ON public.domain_settings
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
