-- The Quest module: the data behind the gated, checklist-shaped member game.
--
-- Quest until now was one screen reading three tables (rituals, completions,
-- streaks). The rebuilt module is a section: an onboarding gate that stays
-- shut until a profile is filled and a handbook is read, a linear tool chain
-- that unlocks one step at a time, a member-written story feed, and an award
-- ladder whose top rungs are applied for rather than auto-granted.
--
-- Each of those needs somewhere to record "how far has this member got",
-- which is what everything below is. The shape is deliberately the same
-- everywhere: one row per (member, thing), so progress is a fact about a
-- person and a step rather than a blob that has to be read and rewritten
-- whole every time a checkbox moves.

-- ------------------------------------------------- rituals, made richer --

-- The seven daily practices are grouped on screen (mindset / community) and
-- some of them carry media or a deep link into another tool. That was all
-- hardcoded in the page; these columns move it into the row, so a coach can
-- change the ritual list without a deploy.
ALTER TABLE public.quest_daily_rituals
  ADD COLUMN IF NOT EXISTS category     text NOT NULL DEFAULT 'mindset',
  ADD COLUMN IF NOT EXISTS icon         text,
  ADD COLUMN IF NOT EXISTS audio_url    text,
  ADD COLUMN IF NOT EXISTS action_url   text,
  ADD COLUMN IF NOT EXISTS action_label text;

COMMENT ON COLUMN public.quest_daily_rituals.category IS
  'Grouping heading on the Daily Rituals screen: mindset | community.';
COMMENT ON COLUMN public.quest_daily_rituals.audio_url IS
  'When set, the row renders an inline player plus a "listened elsewhere" escape hatch.';
COMMENT ON COLUMN public.quest_daily_rituals.action_url IS
  'Optional deep link out of the checklist and into the tool the ritual is about.';

-- The two community practices are the ones that point at other members.
UPDATE public.quest_daily_rituals
   SET category = 'community'
 WHERE lower(title) LIKE '%story%' OR lower(title) LIKE '%comment%';

-- Mindset is five practices, not four. Guarded on the title so re-running the
-- migration cannot deal a member an eighth ritual they can never finish --
-- the streak only advances when every active ritual is ticked.
INSERT INTO public.quest_daily_rituals (title, description, xp_reward, sort_order, category)
SELECT 'Read my codex', 'Open your personal codex and read it through', 10, 7, 'mindset'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.quest_daily_rituals WHERE lower(title) LIKE '%codex%'
 );

-- --------------------------------------------------- the profile itself --

-- Step one of the gate. Kept apart from public.profiles because that table is
-- world-readable (it feeds every byline and directory in the app) and this
-- one is not: it holds a phone number and a join date. Nobody reads anybody
-- else's row, which is why the achiever directory is built from profiles and
-- never from here.
CREATE TABLE IF NOT EXISTS public.quest_profiles (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone             text,
  city              text,
  join_date         date,
  -- Pulled from the billing system rather than typed. Written by a sync, read
  -- as a fact -- the member cannot promote themselves to Diamond by editing a
  -- form, because the UI renders these read-only and nothing else writes them.
  membership_level  text NOT NULL DEFAULT 'Member',
  achievement_level text NOT NULL DEFAULT 'Starter',
  membership_synced_at timestamptz,
  -- The creator identity the Story Engine publishes under.
  designation       text,
  community_name    text,
  -- { "instagram": "handle", "linkedin": "handle", ... }. A map rather than
  -- columns because the platform list is a front-end constant that will grow,
  -- and each new one should not be a migration.
  socials           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quest_profiles IS
  'Private half of a Quest identity. Own-row access only; the public half lives in public.profiles.';

ALTER TABLE public.quest_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage their own quest profile" ON public.quest_profiles;
CREATE POLICY "Members manage their own quest profile"
  ON public.quest_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------- handbook state --

-- Step two of the gate. One row per section read, so the percentage on the
-- dashboard is a COUNT and marking a section read is an INSERT that cannot
-- race with another tab rewriting the whole set.
CREATE TABLE IF NOT EXISTS public.quest_handbook_progress (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Matches a key in src/lib/quest/handbook.ts. Text, not a foreign key: the
  -- handbook is authored content that ships with the front end, and a member
  -- who read a section that later gets renamed should not lose the row.
  section_key  text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section_key)
);

ALTER TABLE public.quest_handbook_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage their own handbook progress" ON public.quest_handbook_progress;
CREATE POLICY "Members manage their own handbook progress"
  ON public.quest_handbook_progress FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------- the story feed --

CREATE TABLE IF NOT EXISTS public.quest_stories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  excerpt      text,
  body         text NOT NULL DEFAULT '',
  cover_url    text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  view_count   integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quest_stories_published_idx
  ON public.quest_stories (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS quest_stories_author_idx
  ON public.quest_stories (user_id, created_at DESC);

ALTER TABLE public.quest_stories ENABLE ROW LEVEL SECURITY;

-- An author sees their drafts. Everyone else only ever sees what was
-- published, so "unpublish" is a real retraction and not a display flag.
DROP POLICY IF EXISTS "Authors manage their own stories" ON public.quest_stories;
CREATE POLICY "Authors manage their own stories"
  ON public.quest_stories FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members read published stories" ON public.quest_stories;
CREATE POLICY "Members read published stories"
  ON public.quest_stories FOR SELECT TO authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Staff moderate stories" ON public.quest_stories;
CREATE POLICY "Staff moderate stories"
  ON public.quest_stories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'));

CREATE TABLE IF NOT EXISTS public.quest_story_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   uuid NOT NULL REFERENCES public.quest_stories(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quest_story_comments_story_idx
  ON public.quest_story_comments (story_id, created_at);

ALTER TABLE public.quest_story_comments ENABLE ROW LEVEL SECURITY;

-- Readable only where the story itself is readable, so retracting a story
-- takes its comment thread with it instead of leaving the replies exposed.
DROP POLICY IF EXISTS "Members read comments on published stories" ON public.quest_story_comments;
CREATE POLICY "Members read comments on published stories"
  ON public.quest_story_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quest_stories s
     WHERE s.id = story_id AND (s.status = 'published' OR s.user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Members write their own comments" ON public.quest_story_comments;
CREATE POLICY "Members write their own comments"
  ON public.quest_story_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.quest_stories s WHERE s.id = story_id AND s.status = 'published'
  ));

DROP POLICY IF EXISTS "Members delete their own comments" ON public.quest_story_comments;
CREATE POLICY "Members delete their own comments"
  ON public.quest_story_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- A view is a counter bump on somebody else's row, which no member-facing
-- UPDATE policy should ever allow -- granting it would also let a member
-- rewrite the story's title. SECURITY DEFINER, taking only the story id, is
-- the narrow hole: it can raise that one integer and nothing else.
CREATE OR REPLACE FUNCTION public.quest_record_story_view(p_story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.quest_stories
     SET view_count = view_count + 1
   WHERE id = p_story_id
     AND status = 'published'
     -- An author refreshing their own story is not an audience.
     AND user_id <> auth.uid();
END;
$function$;

REVOKE ALL ON FUNCTION public.quest_record_story_view(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.quest_record_story_view(uuid) TO authenticated;

-- -------------------------------------------------------- the tool chain --

-- Seven tools, unlocked in order. The row records the outcome of one tool for
-- one member; whether the *next* one is open is derived from these rows in
-- the front end rather than stored, so re-ordering the chain cannot strand a
-- member behind a lock that no longer matches the list.
CREATE TABLE IF NOT EXISTS public.quest_power_tool_runs (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Matches a key in src/lib/quest/powerTools.ts.
  tool_key     text NOT NULL,
  status       text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'done')),
  -- 0-100 where the tool produces one, e.g. the Skills Scorecard. Feeds the
  -- aggregate Business Potency number at the top of the screen.
  score        integer CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  -- The one line the chain row shows under the tool name once it is done,
  -- e.g. "Core topic: Digital Marketing".
  summary      text,
  -- { "<field key>": "<what they wrote>" }. The answers are kept as data
  -- rather than parsed back out of `output`: a member's answer can contain a
  -- blank line, which would truncate it on the way back in.
  answers      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- The rendered artefact behind the .txt download, generated from `answers`.
  output       text,
  completed_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_key)
);

ALTER TABLE public.quest_power_tool_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage their own tool runs" ON public.quest_power_tool_runs;
CREATE POLICY "Members manage their own tool runs"
  ON public.quest_power_tool_runs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------- award applications --

-- The bottom of the award ladder is earned automatically. The top of it is a
-- revenue claim, which is why those rungs read "Apply Now" instead of
-- unlocking themselves: a human approves them.
CREATE TABLE IF NOT EXISTS public.quest_award_applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Matches a key in src/lib/quest/awards.ts.
  award_key   text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence    text,
  review_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, award_key)
);

ALTER TABLE public.quest_award_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their own applications" ON public.quest_award_applications;
CREATE POLICY "Members read their own applications"
  ON public.quest_award_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'));

-- A member applies. A member does not approve: the WITH CHECK pins the status
-- to 'pending' on the way in, and only staff hold the UPDATE policy that can
-- move it off that.
DROP POLICY IF EXISTS "Members apply for awards" ON public.quest_award_applications;
CREATE POLICY "Members apply for awards"
  ON public.quest_award_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Staff review applications" ON public.quest_award_applications;
CREATE POLICY "Staff review applications"
  ON public.quest_award_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coach'));

-- ---------------------------------------------------------- quest media --

-- Profile photos and story covers. Public read, because these end up on
-- published stories and in the achiever directory; writes are scoped to a
-- folder named after the uploader, so one member cannot overwrite another's
-- photo by guessing a path.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('quest-media', 'quest-media', true, 5242880)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view quest media" ON storage.objects;
CREATE POLICY "Anyone can view quest media" ON storage.objects
  FOR SELECT USING (bucket_id = 'quest-media');

DROP POLICY IF EXISTS "Members upload their own quest media" ON storage.objects;
CREATE POLICY "Members upload their own quest media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quest-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Members replace their own quest media" ON storage.objects;
CREATE POLICY "Members replace their own quest media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'quest-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Members delete their own quest media" ON storage.objects;
CREATE POLICY "Members delete their own quest media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quest-media' AND (storage.foldername(name))[1] = auth.uid()::text);
