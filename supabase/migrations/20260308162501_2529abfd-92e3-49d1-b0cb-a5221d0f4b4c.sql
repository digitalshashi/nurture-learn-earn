
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  meeting_link text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  occurrence_number integer DEFAULT 1,
  total_occurrences integer DEFAULT 1,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  meeting_type text NOT NULL DEFAULT 'custom',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own events
CREATE POLICY "Coaches can manage own events"
ON public.events FOR ALL
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Students can view events for courses they're enrolled in
CREATE POLICY "Students can view enrolled course events"
ON public.events FOR SELECT
USING (
  course_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = events.course_id AND e.user_id = auth.uid()
  )
  OR created_by = auth.uid()
);
