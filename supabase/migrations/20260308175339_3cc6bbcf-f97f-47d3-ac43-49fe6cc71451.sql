
-- Automations table
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'email', -- email, whatsapp, notification
  trigger_type text NOT NULL DEFAULT 'course_purchase',
  trigger_config jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own automations" ON public.automations
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Automation actions table
CREATE TABLE public.automation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  action_type text NOT NULL DEFAULT 'send_email', -- send_email, send_whatsapp, send_notification, assign_tag, unlock_course, add_to_community, grant_xp
  action_config jsonb DEFAULT '{}'::jsonb,
  delay_minutes integer DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own automation actions" ON public.automation_actions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.automations a WHERE a.id = automation_actions.automation_id AND a.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.automations a WHERE a.id = automation_actions.automation_id AND a.coach_id = auth.uid()));

-- Automation templates table
CREATE TABLE public.automation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'email', -- email, whatsapp, notification
  category text DEFAULT 'general',
  subject text,
  content text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own templates" ON public.automation_templates
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Automation logs table
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.automations(id) ON DELETE SET NULL,
  coach_id uuid NOT NULL,
  user_id uuid,
  user_email text,
  user_name text,
  channel text NOT NULL,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches view own automation logs" ON public.automation_logs
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- WhatsApp templates table
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  category text DEFAULT 'utility',
  header_type text DEFAULT 'none', -- none, text, image, video
  header_content text,
  body_text text NOT NULL,
  footer_text text,
  buttons jsonb DEFAULT '[]'::jsonb,
  variables jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft, pending, approved, rejected
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own whatsapp templates" ON public.whatsapp_templates
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- WhatsApp account config
CREATE TABLE public.whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'meta', -- meta, twilio, 360dialog
  phone_number text,
  api_key text,
  business_account_id text,
  is_connected boolean NOT NULL DEFAULT false,
  credits_available integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own whatsapp accounts" ON public.whatsapp_accounts
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Events personalisation toggles
CREATE TABLE public.automation_event_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  event_key text NOT NULL, -- e.g. 'whatsapp_purchase_confirmation', 'email_workshop_reminder_24h'
  channel text NOT NULL DEFAULT 'email',
  is_enabled boolean NOT NULL DEFAULT true,
  template_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, event_key)
);

ALTER TABLE public.automation_event_toggles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own event toggles" ON public.automation_event_toggles
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
