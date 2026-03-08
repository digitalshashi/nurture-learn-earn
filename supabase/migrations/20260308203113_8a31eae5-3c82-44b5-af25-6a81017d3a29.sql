
-- Daily rituals that coaches can define
CREATE TABLE public.quest_daily_rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  xp_reward integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quest_daily_rituals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active rituals" ON public.quest_daily_rituals FOR SELECT USING (is_active = true);
CREATE POLICY "Coaches manage rituals" ON public.quest_daily_rituals FOR ALL USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

-- Track which rituals a user completed on which day
CREATE TABLE public.quest_ritual_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ritual_id uuid NOT NULL REFERENCES public.quest_daily_rituals(id) ON DELETE CASCADE,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ritual_id, completed_date)
);
ALTER TABLE public.quest_ritual_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own completions" ON public.quest_ritual_completions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User streaks
CREATE TABLE public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completed_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own streak" ON public.user_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view streaks" ON public.user_streaks FOR SELECT USING (true);

-- Seed default daily rituals
INSERT INTO public.quest_daily_rituals (title, description, xp_reward, sort_order) VALUES
  ('Listen to mindset audio', 'Start your day with powerful mindset training', 10, 1),
  ('Read goal card', 'Review your written goals to stay focused', 10, 2),
  ('Write 20 goals', 'Write down your top 20 goals daily', 10, 3),
  ('Listen to affirmations', 'Play your success affirmations', 10, 4),
  ('Read a story', 'Read a success story from the community', 10, 5),
  ('Leave a comment', 'Encourage fellow champions in the community', 10, 6);
