
CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  -- Input fields
  coach_name text NOT NULL DEFAULT '',
  skill text NOT NULL DEFAULT '',
  target_audience text NOT NULL DEFAULT '',
  core_outcome text NOT NULL DEFAULT '',
  workshop_date date,
  workshop_time text DEFAULT '',
  whatsapp_link text DEFAULT '',
  cta_form_link text DEFAULT '',
  mentor_image_url text,
  thumbnail_url text,
  -- AI generated content (JSONB)
  generated_content jsonb DEFAULT '{}'::jsonb,
  -- Analytics
  facebook_pixel_id text,
  ga4_id text,
  tracking_enabled boolean DEFAULT false,
  -- Testimonials & bonuses (editable)
  testimonials jsonb DEFAULT '[]'::jsonb,
  bonuses jsonb DEFAULT '[]'::jsonb,
  certificate_image_url text,
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone,
  UNIQUE(slug)
);

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own landing pages" ON public.landing_pages
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Anyone can view published landing pages" ON public.landing_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published');
