
-- SaaS Plans that Super Admin creates for coaches
CREATE TABLE public.saas_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  -- Pricing
  monthly_price numeric NOT NULL DEFAULT 0,
  yearly_price numeric NOT NULL DEFAULT 0,
  commission_percent numeric NOT NULL DEFAULT 0,
  billing_type text NOT NULL DEFAULT 'monthly', -- monthly, yearly, commission, hybrid
  -- Limits
  max_courses integer DEFAULT NULL,
  max_students integer DEFAULT NULL,
  storage_limit_mb integer DEFAULT NULL,
  -- Module access (array of allowed module keys)
  allowed_modules text[] NOT NULL DEFAULT ARRAY['courses', 'events', 'community', 'gamification', 'analytics', 'affiliates', 'ai_tools'],
  -- Meta
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active plans
CREATE POLICY "Anyone can view active plans"
ON public.saas_plans FOR SELECT TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Only admins can manage plans
CREATE POLICY "Admins manage plans"
ON public.saas_plans FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Coach subscriptions / plan assignments
CREATE TABLE public.coach_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.saas_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active', -- active, expired, cancelled, trial
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  assigned_by uuid NOT NULL, -- the admin who assigned this
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(coach_id, plan_id)
);

ALTER TABLE public.coach_subscriptions ENABLE ROW LEVEL SECURITY;

-- Coaches can view own subscriptions
CREATE POLICY "Coaches view own subscriptions"
ON public.coach_subscriptions FOR SELECT TO authenticated
USING (coach_id = auth.uid());

-- Admins manage all subscriptions
CREATE POLICY "Admins manage subscriptions"
ON public.coach_subscriptions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
