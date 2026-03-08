
-- Add course settings columns
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS show_as_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_drm boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disable_qna boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disable_comments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS default_video_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS drip_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS linked_services text[];

-- Add drip fields to sections
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS drip_delay_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drip_date date;

-- Add drip fields to chapters
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS drip_delay_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drip_date date,
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS is_assignment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assignment_config jsonb DEFAULT '{}'::jsonb;

-- Assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score integer DEFAULT 50,
  max_retakes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Coaches can manage assignments" ON public.assignments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM chapters ch
    JOIN sections s ON s.id = ch.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE ch.id = assignments.chapter_id AND c.coach_id = auth.uid()
  )
);

-- Assignment submissions
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answer text,
  score integer,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz
);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions" ON public.assignment_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches can view submissions" ON public.assignment_submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN chapters ch ON ch.id = a.chapter_id
    JOIN sections s ON s.id = ch.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = assignment_submissions.assignment_id AND c.coach_id = auth.uid()
  )
);
CREATE POLICY "Coaches can grade submissions" ON public.assignment_submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM assignments a
    JOIN chapters ch ON ch.id = a.chapter_id
    JOIN sections s ON s.id = ch.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE a.id = assignment_submissions.assignment_id AND c.coach_id = auth.uid()
  )
);

-- Questions (QnA)
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text,
  answered_by uuid,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Users can ask questions" ON public.questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own questions" ON public.questions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Coaches can answer questions" ON public.questions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM chapters ch
    JOIN sections s ON s.id = ch.section_id
    JOIN courses c ON c.id = s.course_id
    WHERE ch.id = questions.chapter_id AND c.coach_id = auth.uid()
  )
);

-- Course reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  review_text text,
  coach_reply text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Coaches can reply to reviews" ON public.reviews FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM courses c WHERE c.id = reviews.course_id AND c.coach_id = auth.uid()
  )
);

-- Chatbot questions
CREATE TABLE public.chatbot_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  question text NOT NULL,
  bot_answer text,
  is_satisfied boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbot_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chatbot questions" ON public.chatbot_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can ask chatbot" ON public.chatbot_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches can view chatbot questions" ON public.chatbot_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM courses c WHERE c.id = chatbot_questions.course_id AND c.coach_id = auth.uid()
  )
);
CREATE POLICY "Users can rate chatbot" ON public.chatbot_questions FOR UPDATE USING (auth.uid() = user_id);
