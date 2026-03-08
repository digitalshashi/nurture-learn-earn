
-- Email sender accounts (SMTP or API-based)
CREATE TABLE public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  provider text NOT NULL DEFAULT 'smtp', -- smtp, sendgrid, ses, mailgun, postmark, brevo, resend
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_encryption text DEFAULT 'tls', -- tls, ssl, none
  smtp_username text,
  smtp_password text,
  api_key text,
  api_domain text,
  api_region text,
  is_default boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Email broadcasts (campaigns)
CREATE TABLE public.email_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  title text NOT NULL,
  subject text NOT NULL,
  content text, -- HTML content
  sender_account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL,
  broadcast_type text NOT NULL DEFAULT 'email', -- email, push, whatsapp
  status text NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  emails_sent integer NOT NULL DEFAULT 0,
  emails_delivered integer NOT NULL DEFAULT 0,
  emails_opened integer NOT NULL DEFAULT 0,
  emails_clicked integer NOT NULL DEFAULT 0,
  emails_bounced integer NOT NULL DEFAULT 0,
  emails_unsubscribed integer NOT NULL DEFAULT 0,
  recipient_source text, -- courses, community, csv, manual
  recipient_filter jsonb DEFAULT '{}',
  exclude_filter jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Individual recipients for each broadcast
CREATE TABLE public.email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.email_broadcasts(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, failed
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Email delivery logs
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES public.email_broadcasts(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.email_recipients(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- sent, delivered, opened, clicked, bounced, complained, unsubscribed
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unsubscribed users
CREATE TABLE public.email_unsubscribed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  email text NOT NULL,
  user_id uuid,
  reason text,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_id, email)
);

-- Enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribed ENABLE ROW LEVEL SECURITY;

-- RLS: Coaches manage own email accounts
CREATE POLICY "Coaches manage own email accounts" ON public.email_accounts FOR ALL
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- RLS: Coaches manage own broadcasts
CREATE POLICY "Coaches manage own broadcasts" ON public.email_broadcasts FOR ALL
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- RLS: Coaches manage recipients of own broadcasts
CREATE POLICY "Coaches manage broadcast recipients" ON public.email_recipients FOR ALL
  USING (EXISTS (SELECT 1 FROM public.email_broadcasts b WHERE b.id = broadcast_id AND b.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.email_broadcasts b WHERE b.id = broadcast_id AND b.coach_id = auth.uid()));

-- RLS: Coaches view logs of own broadcasts
CREATE POLICY "Coaches view own email logs" ON public.email_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.email_broadcasts b WHERE b.id = broadcast_id AND b.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.email_broadcasts b WHERE b.id = broadcast_id AND b.coach_id = auth.uid()));

-- RLS: Coaches manage own unsubscribed list
CREATE POLICY "Coaches manage own unsubscribes" ON public.email_unsubscribed FOR ALL
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
