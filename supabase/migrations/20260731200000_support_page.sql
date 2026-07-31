-- Support Hub: stuck areas, checklists, resources, FAQ, and user progress
-- All content tables + progress are realtime-enabled so the Support page
-- updates live without a full reload.

-- ─── Stuck areas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_stuck_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'help-circle',
  color text NOT NULL DEFAULT 'hsl(7 95% 60%)',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Checklist items per stuck area ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_stuck_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.support_stuck_areas(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_stuck_checklist_area
  ON public.support_stuck_checklist(area_id);

-- ─── Resources per stuck area ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_stuck_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES public.support_stuck_areas(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  resource_type text NOT NULL DEFAULT 'article',
  url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_stuck_resources_area
  ON public.support_stuck_resources(area_id);

-- ─── User checklist progress ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checklist_item_id uuid NOT NULL REFERENCES public.support_stuck_checklist(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checklist_item_id)
);

CREATE INDEX IF NOT EXISTS idx_support_checklist_progress_user
  ON public.support_checklist_progress(user_id);

-- ─── User's currently selected stuck area ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_user_stuck (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  area_id uuid REFERENCES public.support_stuck_areas(id) ON DELETE SET NULL,
  selected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── FAQ topics ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_faq_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  icon_name text NOT NULL DEFAULT 'book-open',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── FAQ articles ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_faq_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.support_faq_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_faq_articles_topic
  ON public.support_faq_articles(topic_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.support_stuck_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_stuck_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_stuck_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_user_stuck ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_faq_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_faq_articles ENABLE ROW LEVEL SECURITY;

-- Content: all authenticated users can read active rows; coaches/admins manage all
DROP POLICY IF EXISTS "Anyone authenticated can read stuck areas" ON public.support_stuck_areas;
CREATE POLICY "Anyone authenticated can read stuck areas"
  ON public.support_stuck_areas FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Coaches manage stuck areas" ON public.support_stuck_areas;
CREATE POLICY "Coaches manage stuck areas"
  ON public.support_stuck_areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Anyone authenticated can read checklist" ON public.support_stuck_checklist;
CREATE POLICY "Anyone authenticated can read checklist"
  ON public.support_stuck_checklist FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Coaches manage checklist" ON public.support_stuck_checklist;
CREATE POLICY "Coaches manage checklist"
  ON public.support_stuck_checklist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Anyone authenticated can read resources" ON public.support_stuck_resources;
CREATE POLICY "Anyone authenticated can read resources"
  ON public.support_stuck_resources FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Coaches manage resources" ON public.support_stuck_resources;
CREATE POLICY "Coaches manage resources"
  ON public.support_stuck_resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users manage own checklist progress" ON public.support_checklist_progress;
CREATE POLICY "Users manage own checklist progress"
  ON public.support_checklist_progress FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own stuck selection" ON public.support_user_stuck;
CREATE POLICY "Users manage own stuck selection"
  ON public.support_user_stuck FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone authenticated can read faq topics" ON public.support_faq_topics;
CREATE POLICY "Anyone authenticated can read faq topics"
  ON public.support_faq_topics FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Coaches manage faq topics" ON public.support_faq_topics;
CREATE POLICY "Coaches manage faq topics"
  ON public.support_faq_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Anyone authenticated can read faq articles" ON public.support_faq_articles;
CREATE POLICY "Anyone authenticated can read faq articles"
  ON public.support_faq_articles FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Coaches manage faq articles" ON public.support_faq_articles;
CREATE POLICY "Coaches manage faq articles"
  ON public.support_faq_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ─── Realtime ───────────────────────────────────────────────────────────────
ALTER TABLE public.support_stuck_areas REPLICA IDENTITY FULL;
ALTER TABLE public.support_stuck_checklist REPLICA IDENTITY FULL;
ALTER TABLE public.support_stuck_resources REPLICA IDENTITY FULL;
ALTER TABLE public.support_checklist_progress REPLICA IDENTITY FULL;
ALTER TABLE public.support_user_stuck REPLICA IDENTITY FULL;
ALTER TABLE public.support_faq_topics REPLICA IDENTITY FULL;
ALTER TABLE public.support_faq_articles REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'support_stuck_areas',
    'support_stuck_checklist',
    'support_stuck_resources',
    'support_checklist_progress',
    'support_user_stuck',
    'support_faq_topics',
    'support_faq_articles'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ─── Permission for Support page ────────────────────────────────────────────
INSERT INTO public.role_permissions (role, feature_key, enabled) VALUES
  ('student', 'support', true),
  ('coach', 'support', true),
  ('admin', 'support', true)
ON CONFLICT (role, feature_key) DO NOTHING;

-- ─── Seed stuck areas ───────────────────────────────────────────────────────
INSERT INTO public.support_stuck_areas (slug, title, description, icon_name, color, sort_order) VALUES
  ('niche', 'Niche Stuck', 'Can''t pick one micro-niche to commit to', 'target', 'hsl(25 95% 53%)', 1),
  ('offer', 'Offer Stuck', 'Don''t know what to sell or how to price it', 'tag', 'hsl(280 70% 55%)', 2),
  ('tech', 'Tech Stuck', 'Overwhelmed by tools, software and setup', 'cpu', 'hsl(200 80% 50%)', 3),
  ('content', 'Content Stuck', 'Don''t know what to post or how to stay consistent', 'pen-line', 'hsl(340 75% 55%)', 4),
  ('lead', 'Lead Stuck', 'Not getting enough leads or qualified leads', 'user-plus', 'hsl(160 60% 45%)', 5),
  ('webinar', 'Webinar Stuck', 'Webinar shows up low or no one converts', 'video', 'hsl(239 84% 67%)', 6),
  ('sales', 'Sales Stuck', 'Not closing calls or handling objections', 'handshake', 'hsl(142 71% 40%)', 7),
  ('mindset', 'Mindset Stuck', 'Self-doubt, imposter syndrome, fear of judgment', 'brain', 'hsl(45 93% 47%)', 8),
  ('community', 'Community Stuck', 'Don''t feel connected or supported in the journey', 'users', 'hsl(192 70% 43%)', 9),
  ('scale', 'Scale Stuck', 'Have students but can''t grow beyond ₹3-5L/month', 'trending-up', 'hsl(7 95% 60%)', 10)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Helper: insert checklist items for an area by slug (idempotent by title+area)
DO $$
DECLARE
  aid uuid;
BEGIN
  -- Niche
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'niche';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'List 5 problems you can solve from personal experience', 'Write problems you have already solved for yourself or others.', 1),
    (aid, 'Pick the audience you can reach most easily this month', 'Friends, past clients, LinkedIn, Instagram — where do you already have access?', 2),
    (aid, 'Validate demand with 5 conversations', 'DM or call 5 people and ask if they would pay to solve this.', 3),
    (aid, 'Write a one-sentence niche statement', 'I help [who] achieve [result] without [pain].', 4),
    (aid, 'Commit for 90 days before switching', 'Set a calendar reminder. No niche-hopping for 3 months.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'Niche Selection Framework', 'A simple worksheet to narrow from broad idea to micro-niche.', 'template', '/support?topic=niche-selection', 1),
    (aid, 'How to validate a niche in 7 days', 'Step-by-step validation process used by successful coaches.', 'article', '/support?topic=niche-selection', 2),
    (aid, 'Watch: Finding your micro-niche', 'Short walkthrough of the niche decision process.', 'video', '/courses', 3);

  -- Offer
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'offer';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Define the transformation in one line', 'Before → After for your ideal client.', 1),
    (aid, 'Choose delivery format', '1:1 coaching, group program, course, or hybrid.', 2),
    (aid, 'Price based on outcome, not hours', 'Anchor to the value of the result, not your time.', 3),
    (aid, 'Write a simple offer stack', 'Core offer + bonuses + guarantee.', 4),
    (aid, 'Test the price with 3 soft pitches', 'Share the offer privately and note objections.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'Offer Stack Template', 'Fill-in template for your core offer and bonuses.', 'template', '/support?topic=curriculum-design', 1),
    (aid, 'Pricing your first program', 'Guidelines for ₹9,999–₹99,999 pricing bands.', 'article', '/support?topic=curriculum-design', 2),
    (aid, 'Create your first service', 'Use the Services builder to publish your offer.', 'link', '/services', 3);

  -- Tech
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'tech';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Pick one platform and stick to it', 'Use this app for courses, community, and CRM — avoid tool sprawl.', 1),
    (aid, 'Set up your first course or service', 'Ship something imperfect this week.', 2),
    (aid, 'Connect payment (Razorpay)', 'You cannot sell until checkout works.', 3),
    (aid, 'Create one landing page', 'Page Builder or AI Landing Page is enough.', 4),
    (aid, 'Ignore advanced automations until you have 10 sales', 'Manual follow-ups beat broken funnels early on.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'Technical Tools Guide', 'Minimum viable tech stack for coaches.', 'article', '/support?topic=technical-tools', 1),
    (aid, 'Course Builder walkthrough', 'Create and publish your first course.', 'link', '/courses', 2),
    (aid, 'Integrations setup', 'Connect payment and marketing tools.', 'link', '/automation/integrations', 3);

  -- Content
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'content';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Build a 30-day content pillar list', '3–5 pillars tied to your niche.', 1),
    (aid, 'Batch-create 7 posts this weekend', 'One sitting beats daily blank-page panic.', 2),
    (aid, 'Use a simple weekly cadence', 'e.g. 3 value posts + 1 story + 1 offer.', 3),
    (aid, 'Repurpose one long piece into 5 short ones', 'Carousel, reel script, thread, email, story.', 4),
    (aid, 'Track what gets saves/DMs, not just likes', 'Double down on formats that start conversations.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'Personal Branding playbook', 'How to show up consistently as the expert.', 'article', '/support?topic=personal-branding', 1),
    (aid, 'AI Content Generator', 'Draft posts and scripts faster inside the app.', 'link', '/ai/content-generator', 2),
    (aid, '30-day content calendar template', 'Ready-to-fill calendar for your niche.', 'template', '/support?topic=personal-branding', 3);

  -- Lead
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'lead';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Define your ideal lead in one paragraph', 'Who, situation, urgency, budget signals.', 1),
    (aid, 'Create one lead magnet', 'PDF, checklist, or mini-workshop.', 2),
    (aid, 'Set up a simple capture form in CRM', 'Stop collecting leads in DMs only.', 3),
    (aid, 'Do daily outreach: 10 meaningful touches', 'Comments, DMs, or warm intros.', 4),
    (aid, 'Score and follow up within 24 hours', 'Speed-to-lead beats perfect copy.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'CRM & lead pipeline guide', 'How to track and nurture leads in this platform.', 'article', '/support?topic=getting-started', 1),
    (aid, 'Open CRM Contacts', 'Import and manage your pipeline.', 'link', '/crm/contacts', 2),
    (aid, 'Meta Leads integration', 'Pull Facebook/Instagram leads automatically.', 'link', '/crm/meta-leads', 3);

  -- Webinar
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'webinar';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Rewrite the title as a clear outcome', 'Promise a specific result in the headline.', 1),
    (aid, 'Send 3 reminder sequences (T-24h, T-1h, T-10m)', 'Show-up rate is mostly follow-up.', 2),
    (aid, 'Open with a hook in the first 3 minutes', 'Story + stakes + what they will walk away with.', 3),
    (aid, 'Teach 1 framework, not 10 tips', 'Clarity converts better than density.', 4),
    (aid, 'Practice the close out loud twice', 'Offer, price, deadline, next step — rehearsed.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'Workshop setup guide', 'Create and promote your next live session.', 'article', '/support?topic=getting-started', 1),
    (aid, 'Workshops page', 'Schedule and manage webinars.', 'link', '/workshops', 2),
    (aid, 'Events personalisation', 'Segment invites and reminders.', 'link', '/automation/events-personalisation', 3);

  -- Sales
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'sales';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Use a discovery call script', 'Goals, blockers, timeline, budget — in that order.', 1),
    (aid, 'List your top 5 objections + responses', 'Price, time, spouse, “I need to think”, trust.', 2),
    (aid, 'Always propose a clear next step', 'Pay link, enrollment form, or follow-up date.', 3),
    (aid, 'Record 3 calls and review one weekly', 'Note talk-ratio and missed closes.', 4),
    (aid, 'Follow up 5 times after a soft no', 'Most closes happen after the first call.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'Objection handling cheat sheet', 'Scripts for the most common sales pushbacks.', 'template', '/support?topic=success-mindset', 1),
    (aid, 'Sales transactions', 'Track what is closing and what is not.', 'link', '/sales/transactions', 2),
    (aid, 'AI Sales Assistant', 'Practice responses and call prep.', 'article', '/support?topic=success-mindset', 3);

  -- Mindset
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'mindset';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Ship one imperfect asset this week', 'Post, offer page, or outreach message.', 1),
    (aid, 'Separate identity from results', 'You are learning a skill, not proving your worth.', 2),
    (aid, 'Write down 3 wins from the last 30 days', 'Evidence beats feelings of fraud.', 3),
    (aid, 'Limit comparison to 10 minutes/day', 'Mute accounts that trigger spiral thinking.', 4),
    (aid, 'Book one accountability check-in', 'A peer or mentor who will ask what you shipped.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'Success Mindset library', 'Articles on confidence, fear, and consistent action.', 'article', '/support?topic=success-mindset', 1),
    (aid, 'LevelUp habits', 'Daily rituals that rebuild confidence through action.', 'link', '/levelup', 2),
    (aid, 'Quest daily rituals', 'Small wins that compound.', 'link', '/quest', 3);

  -- Community
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'community';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Introduce yourself in the community feed', 'Who you help + what you are working on this month.', 1),
    (aid, 'Comment thoughtfully on 3 posts daily', 'Give value before you ask for help.', 2),
    (aid, 'Join one relevant channel and show up weekly', 'Consistency builds belonging.', 3),
    (aid, 'DM one member with a genuine compliment', 'Start a real relationship, not a pitch.', 4),
    (aid, 'Ask one specific question when stuck', 'Vague “help me” posts get vague answers.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'ILH Community guide', 'How to get the most from the community.', 'article', '/support?topic=ilh-community', 1),
    (aid, 'Open the Feed', 'Post and engage with members.', 'link', '/feed', 2),
    (aid, 'Channels', 'Topic-based rooms for deeper discussion.', 'link', '/channels', 3);

  -- Scale
  SELECT id INTO aid FROM public.support_stuck_areas WHERE slug = 'scale';
  DELETE FROM public.support_stuck_checklist WHERE area_id = aid;
  DELETE FROM public.support_stuck_resources WHERE area_id = aid;
  INSERT INTO public.support_stuck_checklist (area_id, title, description, sort_order) VALUES
    (aid, 'Document your delivery process', 'If it is only in your head, you cannot hire or productize.', 1),
    (aid, 'Raise prices for the next 5 clients', 'Test a 20–40% increase with stronger positioning.', 2),
    (aid, 'Productize one offer into a group format', 'Free your calendar while increasing capacity.', 3),
    (aid, 'Add one acquisition channel that is not you live', 'Ads, affiliates, or evergreen webinar.', 4),
    (aid, 'Hire or outsource one bottleneck task', 'Content, admin, or sales support.', 5);
  INSERT INTO public.support_stuck_resources (area_id, title, description, resource_type, url, sort_order) VALUES
    (aid, 'Scaling past ₹5L/month', 'Systems for team, offers, and acquisition.', 'article', '/support?topic=company-setup', 1),
    (aid, 'Analytics dashboard', 'Know which channels actually drive revenue.', 'link', '/analytics', 2),
    (aid, 'Affiliate program', 'Let students and partners sell for you.', 'link', '/affiliate/manage', 3);
END $$;

-- ─── Seed FAQ topics ────────────────────────────────────────────────────────
INSERT INTO public.support_faq_topics (slug, title, icon_name, sort_order) VALUES
  ('getting-started', 'Getting Started', 'rocket', 1),
  ('account-support', 'Account Support', 'user-cog', 2),
  ('niche-selection', 'Niche Selection', 'target', 3),
  ('curriculum-design', 'Curriculum Design', 'book-open', 4),
  ('company-setup', 'Company Setup', 'building-2', 5),
  ('personal-branding', 'Personal Branding', 'sparkles', 6),
  ('ilh-community', 'ILH Community', 'users', 7),
  ('technical-tools', 'Technical Tools', 'wrench', 8),
  ('success-mindset', 'Success Mindset', 'brain', 9)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  icon_name = EXCLUDED.icon_name,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Seed FAQ articles (counts match the UI: 7,3,6,8,3,7,13,7,8)
DO $$
DECLARE
  tid uuid;
BEGIN
  -- Getting Started (7)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'getting-started';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'How do I complete my profile?', 'Go to My Account from the top nav avatar menu. Add your full name, photo, and bio so other members can recognize you in the feed and channels.', 1),
    (tid, 'Where do I start if I am brand new?', 'Start on the Support page and pick the stuck area that matches how you feel. Complete the checklist there, then open Courses for foundational training and the Feed to introduce yourself.', 2),
    (tid, 'How do I access my courses?', 'Open Courses from the top nav or sidebar. Enrolled courses appear on your dashboard. Click any course to enter the player.', 3),
    (tid, 'How do I join live workshops?', 'Go to Workshops or Student Events. Register for upcoming sessions. You will receive reminders if email/WhatsApp automation is enabled for that event.', 4),
    (tid, 'What is Quest and how do I earn XP?', 'Quest is your daily ritual board. Complete rituals to earn XP, build streaks, and climb the leaderboard. Open /quest every day.', 5),
    (tid, 'How do I message another member?', 'Open Messages from the sidebar, or visit a member profile and start a conversation. Keep messages respectful and on-topic.', 6),
    (tid, 'Who do I contact for urgent help?', 'Use the contact form on this Support page, or email the support address configured by your coach. For community questions, post in the Feed or the relevant channel.', 7);

  -- Account Support (3)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'account-support';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'I cannot log in — what should I do?', 'Use the OTP login on the Login page. Check spam for the code. If the email never arrives, confirm you are using the same email you enrolled with and contact support.', 1),
    (tid, 'How do I update my email or password?', 'Open My Account. Profile fields can be updated there. Passwordless OTP is the primary login method; contact support if you need the email on your account changed.', 2),
    (tid, 'How do I delete my account?', 'Account deletion is handled by support for safety. Open My Account and use the delete flow, or email support with the subject “Account deletion request”.', 3);

  -- Niche Selection (6)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'niche-selection';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'What is a micro-niche?', 'A micro-niche is a specific audience + specific problem + specific outcome. Example: “I help first-time Indian freelancers land their first ₹50k client in 60 days.”', 1),
    (tid, 'How narrow is too narrow?', 'If you cannot find 20 people to talk to in a month, it may be too narrow. If everyone is a fit, it is too broad. Aim for a group you can describe in one sentence.', 2),
    (tid, 'Should I pick a niche based on passion or profit?', 'Pick the intersection: skill you have, problem people pay for, and audience you can reach. Passion alone without demand stalls revenue.', 3),
    (tid, 'Can I change my niche later?', 'Yes, but commit for 90 days first. Constant switching resets learning and audience trust. Document learnings before you pivot.', 4),
    (tid, 'How do I test a niche without building a full course?', 'Run 5 discovery calls, sell a small pilot (even 1:1), and measure willingness to pay. Build the full curriculum after the pilot works.', 5),
    (tid, 'What if competitors already exist in my niche?', 'Competition signals demand. Differentiate with your story, process, proof, and audience intimacy — not by inventing a brand-new niche.', 6);

  -- Curriculum Design (8)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'curriculum-design';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'How do I structure my first curriculum?', 'Start with the end result, reverse-engineer milestones, then lessons. 4–8 modules is enough for a first paid program.', 1),
    (tid, 'How long should each lesson be?', 'Prefer 5–15 minute lessons. Short lessons get finished. Use one idea per lesson with a clear action.', 2),
    (tid, 'Do I need videos for every lesson?', 'No. Mix video, text, worksheets, and live calls. Ship with what you can record this week.', 3),
    (tid, 'How do I price a cohort vs a self-paced course?', 'Cohorts usually price higher because of access and accountability. Self-paced can be lower ticket with upsells into coaching.', 4),
    (tid, 'What bonuses actually increase conversions?', 'Bonuses that remove friction: templates, swipe files, private community access, or a live Q&A — not random PDFs.', 5),
    (tid, 'How do I use the Course Builder?', 'Go to Courses → create course → add sections and chapters → upload video or text → publish. You can reorder later.', 6),
    (tid, 'Should I drip content or unlock everything?', 'For beginners, drip reduces overwhelm. For advanced buyers who want speed, open access works. Match format to promise.', 7),
    (tid, 'How do I collect student feedback?', 'Use Q&A, comments, and assignments inside Course Manage. Run a simple NPS form after module 2 and at the end.', 8);

  -- Company Setup (3)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'company-setup';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'Do I need a company to start selling?', 'You can start as a sole proprietor in many cases, but check local tax rules. Get basic invoicing and a business bank account early.', 1),
    (tid, 'What legal pages do I need on my site?', 'At minimum: privacy policy, terms of service, and refund policy. Add them to your landing pages before paid ads.', 2),
    (tid, 'When should I hire help?', 'When a task is repeatable, measurable, and blocking growth — usually admin, editing, or sales follow-up after you have consistent demand.', 3);

  -- Personal Branding (7)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'personal-branding';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'What should my bio say?', 'Who you help + result + proof. Avoid vague “motivational coach / dreamer” bios. Specificity builds trust.', 1),
    (tid, 'How often should I post?', 'Consistency beats volume. 3–5 quality posts per week with engagement is stronger than daily empty posts.', 2),
    (tid, 'What content pillars should I use?', 'Pick 3–5: teaching, proof/stories, personal journey, audience Q&A, and offers. Rotate through them.', 3),
    (tid, 'How do I look professional without a fancy setup?', 'Good lighting, clean background, clear audio. Phone cameras are enough. Message quality matters more than gear.', 4),
    (tid, 'Should I be on every platform?', 'No. Master one distribution channel where your audience already is, then repurpose.', 5),
    (tid, 'How do I handle haters or judgment?', 'Moderate comments, do not argue in public, and keep posting for the people you serve. Fear of judgment shrinks with reps.', 6),
    (tid, 'Can AI help with my personal brand content?', 'Yes — use AI Content Generator for drafts, then edit in your voice. Never publish raw AI without your stories and opinions.', 7);

  -- ILH Community (13)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'ilh-community';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'How do I introduce myself?', 'Post in the Feed: your name, niche, current goal, and one thing you need help with. Keep it specific.', 1),
    (tid, 'What are the community guidelines?', 'Be respectful, no spam or unsolicited DMs selling, give context when asking for help, and celebrate others’ wins.', 2),
    (tid, 'How do channels work?', 'Channels are topic rooms. Join the ones relevant to your stage. Use threads for side discussions.', 3),
    (tid, 'How do I get faster answers when I am stuck?', 'Share what you already tried, your niche, and a clear question. Tag the stuck area from Support in your post.', 4),
    (tid, 'Can I promote my offer in the community?', 'Only in designated spaces or when someone asks. Value-first engagement builds trust faster than pitches.', 5),
    (tid, 'How do I find accountability partners?', 'Post a request in the Feed or Community channel with your timezone and weekly goal. Offer reciprocity.', 6),
    (tid, 'What is the Leaderboard?', 'It ranks members by XP and engagement. Completing Quest rituals and course activity helps you climb.', 7),
    (tid, 'How do events work for students?', 'Open Student Events to see upcoming live sessions. Register early and add reminders.', 8),
    (tid, 'I feel invisible — what should I do?', 'Show up daily for 14 days: comment, share progress, ask one question. Visibility follows contribution.', 9),
    (tid, 'How do I report inappropriate content?', 'Use report flows on posts/messages where available, or message a coach/admin with a link and screenshot.', 10),
    (tid, 'Are there mastermind or hot-seat sessions?', 'Check Events and announcements in the Feed. Coaches often run live hot seats for members who show up prepared.', 11),
    (tid, 'How do I celebrate wins without bragging?', 'Share the win + the lesson + one tip others can use. The community loves transferable insights.', 12),
    (tid, 'What if I am shy on camera?', 'Start with text posts and voice notes. Join smaller channels first. Confidence grows after action, not before.', 13);

  -- Technical Tools (7)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'technical-tools';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'What is the minimum tech stack I need?', 'This platform (courses + community + CRM) + payment + one social channel. That is enough to sell.', 1),
    (tid, 'How do I set up payments?', 'Connect Razorpay via Integrations / checkout settings used by Services. Test a small purchase end-to-end.', 2),
    (tid, 'How do I build a landing page?', 'Use Page Builder or AI Landing Page Builder. Publish one clear offer page before optimizing design.', 3),
    (tid, 'How do email automations work?', 'Create sequences under Automation → Email. Connect an email account in Email Settings first.', 4),
    (tid, 'Can I run WhatsApp automations?', 'Yes under Automation → WhatsApp after account setup in Account Management.', 5),
    (tid, 'Where do I store course videos?', 'Upload in Course Builder or Video Library. Prefer stable hosting; avoid huge raw files when possible.', 6),
    (tid, 'I am overwhelmed by features — what order should I set up?', '1) Profile 2) Offer/Service 3) Checkout 4) Landing page 5) Course outline 6) CRM. Automations last.', 7);

  -- Success Mindset (8)
  SELECT id INTO tid FROM public.support_faq_topics WHERE slug = 'success-mindset';
  DELETE FROM public.support_faq_articles WHERE topic_id = tid;
  INSERT INTO public.support_faq_articles (topic_id, title, content, sort_order) VALUES
    (tid, 'I feel like an imposter — is that normal?', 'Yes. Imposter feelings are common when you level up. Collect evidence of results and keep shipping. Action reduces the noise.', 1),
    (tid, 'How do I stay consistent when motivation drops?', 'Use systems: calendar blocks, Quest rituals, and public accountability. Motivation is a bonus, not a plan.', 2),
    (tid, 'What if I am afraid of being judged?', 'Most people are busy with their own lives. Publish for the 1% who need your help. Judgment anxiety fades with reps.', 3),
    (tid, 'How do I handle slow months?', 'Review pipeline metrics, re-engage past leads, ship content, and improve the offer. Slow months are data, not identity.', 4),
    (tid, 'Should I wait until I feel confident?', 'No. Confidence comes after action. Use the Support stuck checklists to take the next small step today.', 5),
    (tid, 'How do I avoid burnout?', 'Cap work hours, protect recovery, and productize delivery. Scaling is a systems problem, not a willpower problem.', 6),
    (tid, 'What daily habits help coaches grow?', 'Outreach, content, skill practice, and reflection. Track them in LevelUp or Quest so they become non-negotiable.', 7),
    (tid, 'How do I celebrate progress without losing drive?', 'Log weekly wins, then set the next measurable target. Gratitude and ambition can coexist.', 8);
END $$;
