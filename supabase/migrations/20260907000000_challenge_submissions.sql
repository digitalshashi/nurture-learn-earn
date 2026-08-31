-- Lets members submit proof of progress on a challenge (a link, a photo, or
-- any uploaded file) instead of only tracking a manual progress bar, and lets
-- a coach set how many points each submission is worth. "100 days, 100
-- reels" style challenges need one row per day submitted, not one row per
-- challenge, so this is a separate table rather than a column on
-- challenge_participants.

ALTER TABLE public.gamification_challenges
  ADD COLUMN IF NOT EXISTS points_per_submission integer NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.gamification_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  submission_type text NOT NULL DEFAULT 'link',
  url text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS challenge_submissions_challenge_idx
  ON public.challenge_submissions (challenge_id);
CREATE INDEX IF NOT EXISTS challenge_submissions_user_idx
  ON public.challenge_submissions (user_id);

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own submissions" ON public.challenge_submissions;
CREATE POLICY "Users manage own submissions"
  ON public.challenge_submissions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Coaches view all submissions" ON public.challenge_submissions;
CREATE POLICY "Coaches view all submissions"
  ON public.challenge_submissions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'coach'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
