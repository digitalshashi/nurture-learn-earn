
-- Services table (top-level monetization container)
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  title text NOT NULL,
  slug text,
  description text,
  cover_image_url text,
  cover_video_url text,
  service_type text NOT NULL DEFAULT 'bundle', -- bundle, course, workshop, consultation, membership, digital_product, community
  currency text NOT NULL DEFAULT 'INR',
  price numeric NOT NULL DEFAULT 0,
  discounted_price numeric,
  international_price numeric,
  international_currency text DEFAULT 'USD',
  is_free boolean NOT NULL DEFAULT false,
  enable_subscription boolean NOT NULL DEFAULT false,
  subscription_interval text DEFAULT 'monthly', -- monthly, quarterly, yearly
  subscription_price numeric DEFAULT 0,
  allow_pay_what_you_want boolean NOT NULL DEFAULT false,
  min_pay_amount numeric DEFAULT 0,
  payment_success_heading text DEFAULT 'Payment Successful',
  payment_success_message text DEFAULT 'Congratulations! You now have access.',
  payment_success_button_text text DEFAULT 'Login Now',
  payment_success_button_url text,
  payment_success_sections jsonb DEFAULT '[]'::jsonb,
  custom_fields jsonb DEFAULT '[]'::jsonb,
  terms_conditions text,
  enable_terms boolean NOT NULL DEFAULT false,
  collect_address boolean NOT NULL DEFAULT false,
  collect_gst boolean NOT NULL DEFAULT false,
  advanced_settings jsonb DEFAULT '{}'::jsonb,
  linked_community_id uuid,
  status text NOT NULL DEFAULT 'draft', -- draft, active, paused, archived
  max_seats integer,
  access_duration_days integer,
  drip_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own services" ON public.services
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Anyone can view active services" ON public.services
  FOR SELECT TO authenticated
  USING (status = 'active');

-- Service-Course link
CREATE TABLE public.service_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, course_id)
);

ALTER TABLE public.service_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage service courses" ON public.service_courses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_courses.service_id AND s.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_courses.service_id AND s.coach_id = auth.uid()));

CREATE POLICY "View service courses for active services" ON public.service_courses
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_courses.service_id AND s.status = 'active'));

-- Service-Workshop link
CREATE TABLE public.service_workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, workshop_id)
);

ALTER TABLE public.service_workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage service workshops" ON public.service_workshops
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_workshops.service_id AND s.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_workshops.service_id AND s.coach_id = auth.uid()));

-- Service users (purchases/access)
CREATE TABLE public.service_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, expired, refunded, cancelled
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  amount_paid numeric DEFAULT 0,
  payment_method text,
  transaction_id text,
  coupon_code text,
  custom_fields_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, user_id)
);

ALTER TABLE public.service_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches view service users" ON public.service_users
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_users.service_id AND s.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_users.service_id AND s.coach_id = auth.uid()));

CREATE POLICY "Users view own service access" ON public.service_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can purchase services" ON public.service_users
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add linked_services column to courses for backward compat
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;
