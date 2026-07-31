CREATE TABLE public.login_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_otps TO service_role;
CREATE INDEX login_otps_email_created_idx ON public.login_otps (email, created_at DESC);
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.email_accounts
ADD COLUMN is_platform_default boolean NOT NULL DEFAULT false,
ADD COLUMN reply_to_name text,
ADD COLUMN reply_to_email text;

CREATE POLICY "Admins manage all email accounts" ON public.email_accounts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid,
  template_key text NOT NULL,
  subject text NOT NULL,
  from_name text,
  reply_to_name text,
  reply_to_email text,
  body_html text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

CREATE UNIQUE INDEX email_templates_system_key_uniq ON public.email_templates (template_key) WHERE coach_id IS NULL;
CREATE UNIQUE INDEX email_templates_coach_key_uniq ON public.email_templates (coach_id, template_key) WHERE coach_id IS NOT NULL;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own templates" ON public.email_templates FOR ALL TO authenticated
USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Admins manage all templates" ON public.email_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_templates (coach_id, template_key, subject, body_html)
VALUES (
NULL,
'login_otp',
'Your login code: {{otp_code}}',
'<p>Hi {{full_name}},</p><p>Your one-time login code is:</p><h2 style="letter-spacing:4px;">{{otp_code}}</h2><p>This code expires in {{expiry_minutes}} minutes. If you didn''t request this, you can safely ignore this email.</p>'
);