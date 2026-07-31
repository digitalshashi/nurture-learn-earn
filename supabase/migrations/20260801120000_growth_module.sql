-- Growth module: goal wizard, daily actions/points board, business P&L logger,
-- and AI boosters (ad scripts / webinar scoring). Original build, not derived
-- from any third-party product's schema or content.

-- ─── Goals ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_amount numeric NOT NULL,
  target_date date NOT NULL,
  starting_monthly_revenue numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  pace text NOT NULL DEFAULT 'steady', -- 'aggressive' | 'steady' | 'gradual'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);

-- ─── Monthly progress against a goal's staircase ───────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  month date NOT NULL, -- first day of the month
  revenue numeric NOT NULL DEFAULT 0,
  expenses numeric NOT NULL DEFAULT 0,
  profit numeric GENERATED ALWAYS AS (revenue - expenses) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_progress_goal ON public.monthly_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_monthly_progress_user ON public.monthly_progress(user_id);

-- ─── Daily/weekly actions (BIFA board) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general', -- sales | ads | content | ops | general
  points integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pending', -- pending | done
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actions_user ON public.actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_due ON public.actions(due_date);

-- ─── Reusable action templates (coach/admin authored) ───────────────────────
CREATE TABLE IF NOT EXISTS public.action_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  points integer NOT NULL DEFAULT 10,
  recommended_frequency text NOT NULL DEFAULT 'daily', -- daily | weekly
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Weekly points rollup (leaderboard) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leaderboard_points (
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);

-- ─── AI booster sessions (ad scripts / webinar / showcase scoring) ─────────
CREATE TABLE IF NOT EXISTS public.booster_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'ads' | 'webinar' | 'showcase'
  input_text text NOT NULL DEFAULT '',
  ai_output jsonb,
  score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booster_sessions_user ON public.booster_sessions(user_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booster_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own goals" ON public.goals;
CREATE POLICY "Users manage own goals"
  ON public.goals FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own monthly progress" ON public.monthly_progress;
CREATE POLICY "Users manage own monthly progress"
  ON public.monthly_progress FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own actions" ON public.actions;
CREATE POLICY "Users manage own actions"
  ON public.actions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone authenticated can read action templates" ON public.action_templates;
CREATE POLICY "Anyone authenticated can read action templates"
  ON public.action_templates FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Coaches manage action templates" ON public.action_templates;
CREATE POLICY "Coaches manage action templates"
  ON public.action_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Anyone authenticated can read leaderboard points" ON public.leaderboard_points;
CREATE POLICY "Anyone authenticated can read leaderboard points"
  ON public.leaderboard_points FOR SELECT TO authenticated
  USING (true);
-- Writes to leaderboard_points happen only via the service-role weekly rollup
-- job, so no INSERT/UPDATE policy is granted to regular users.

DROP POLICY IF EXISTS "Users manage own booster sessions" ON public.booster_sessions;
CREATE POLICY "Users manage own booster sessions"
  ON public.booster_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (user_id = auth.uid());

-- ─── Realtime ───────────────────────────────────────────────────────────────
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.monthly_progress REPLICA IDENTITY FULL;
ALTER TABLE public.actions REPLICA IDENTITY FULL;
ALTER TABLE public.leaderboard_points REPLICA IDENTITY FULL;
ALTER TABLE public.booster_sessions REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'goals',
    'monthly_progress',
    'actions',
    'leaderboard_points',
    'booster_sessions'
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

-- ─── Permission for Growth module ───────────────────────────────────────────
INSERT INTO public.role_permissions (role, feature_key, enabled) VALUES
  ('student', 'growth', true),
  ('coach', 'growth', true),
  ('admin', 'growth', true)
ON CONFLICT (role, feature_key) DO NOTHING;

-- ─── Seed a few starter action templates ────────────────────────────────────
INSERT INTO public.action_templates (title, category, points, recommended_frequency) VALUES
  ('Post one piece of content', 'content', 10, 'daily'),
  ('Reach out to 5 new leads', 'sales', 15, 'daily'),
  ('Follow up with 3 warm leads', 'sales', 10, 'daily'),
  ('Review weekly ad performance', 'ads', 10, 'weekly'),
  ('Host or record one webinar', 'ads', 25, 'weekly'),
  ('Update your revenue and expenses', 'ops', 5, 'weekly')
ON CONFLICT DO NOTHING;
