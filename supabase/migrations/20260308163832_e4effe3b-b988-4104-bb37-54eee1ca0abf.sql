
-- XP Rules (coach configurable)
CREATE TABLE public.xp_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_name text NOT NULL UNIQUE,
  xp_value integer NOT NULL DEFAULT 10,
  daily_limit integer DEFAULT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view xp_rules" ON public.xp_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches can manage xp_rules" ON public.xp_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.xp_rules (action_name, xp_value, daily_limit) VALUES
  ('login', 5, 1),
  ('like_post', 2, 10),
  ('comment', 5, 10),
  ('daily_habit', 10, NULL),
  ('task_completed', 20, NULL),
  ('challenge_completed', 100, NULL),
  ('attend_event', 50, NULL),
  ('complete_course', 200, NULL),
  ('post_content', 15, 5);

-- Level Definitions
CREATE TABLE public.level_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number integer NOT NULL UNIQUE,
  xp_required integer NOT NULL,
  badge_name text,
  reward_description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.level_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view levels" ON public.level_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches can manage levels" ON public.level_definitions FOR ALL TO authenticated USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.level_definitions (level_number, xp_required, badge_name) VALUES
  (1, 0, 'Beginner'), (2, 200, 'Learner'), (3, 500, 'Explorer'),
  (4, 1000, 'Achiever'), (5, 2000, 'Bronze'), (6, 3500, 'Silver'),
  (7, 5000, 'Gold'), (8, 7500, 'Platinum'), (9, 10000, 'Diamond'), (10, 15000, 'Master');

-- XP Transactions
CREATE TABLE public.xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  xp_amount integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own xp" ON public.xp_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can earn xp" ON public.xp_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Badges
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text DEFAULT '🏆',
  xp_required integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches can manage badges" ON public.badges FOR ALL TO authenticated USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.badges (name, description, icon) VALUES
  ('Top Performer', 'Consistently high XP earner', '⭐'),
  ('Habit Master', 'Completed 30 day habit streak', '🔥'),
  ('Challenge Champion', 'Completed 5 challenges', '🏆'),
  ('Course Finisher', 'Completed a full course', '📚'),
  ('Community Helper', 'Made 100 community posts', '🤝');

-- User Badges
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own badges" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users earn badges" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Habits
CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  xp_value integer DEFAULT 10,
  color text DEFAULT '#8B5CF6',
  time_of_day time,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habits" ON public.habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Habit Logs
CREATE TABLE public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  xp_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, completed_date)
);
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habit_logs" ON public.habit_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Student Tasks
CREATE TABLE public.student_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  deadline date,
  xp_reward integer DEFAULT 20,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.student_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.student_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Gamification Challenges
CREATE TABLE public.gamification_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  duration_days integer DEFAULT 7,
  xp_reward integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.gamification_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active challenges" ON public.gamification_challenges FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Coaches can manage challenges" ON public.gamification_challenges FOR ALL TO authenticated USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Challenge Participants
CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES public.gamification_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  progress_percent integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own participation" ON public.challenge_participants FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches view all participants" ON public.challenge_participants FOR SELECT TO authenticated USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Productivity Data
CREATE TABLE public.productivity_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  revenue_earned numeric DEFAULT 0,
  ad_spends numeric DEFAULT 0,
  avg_cost_per_lead numeric DEFAULT 0,
  total_leads integer DEFAULT 0,
  total_paid_customers integer DEFAULT 0,
  total_group_size integer DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.productivity_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own data" ON public.productivity_data FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Charity Logs
CREATE TABLE public.charity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  organization_name text NOT NULL,
  category text,
  amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.charity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own charity" ON public.charity_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Checkup Definitions
CREATE TABLE public.checkup_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  frequency text DEFAULT 'monthly',
  description text,
  due_date date,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.checkup_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active checkups" ON public.checkup_definitions FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Coaches manage checkups" ON public.checkup_definitions FOR ALL TO authenticated USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Checkup Submissions
CREATE TABLE public.checkup_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_id uuid REFERENCES public.checkup_definitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score integer,
  actions_total integer DEFAULT 0,
  actions_completed integer DEFAULT 0,
  notes text,
  submitted_at timestamptz DEFAULT now()
);
ALTER TABLE public.checkup_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkup submissions" ON public.checkup_submissions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
