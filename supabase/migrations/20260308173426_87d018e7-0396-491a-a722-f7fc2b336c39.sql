
-- Workshops table (parent for recurring series or one-off)
CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  meeting_link text,
  meeting_type text NOT NULL DEFAULT 'zoom',
  start_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  timezone text NOT NULL DEFAULT 'IST',
  is_recurring boolean NOT NULL DEFAULT false,
  enable_waiting_room boolean NOT NULL DEFAULT false,
  auto_recording boolean NOT NULL DEFAULT true,
  auto_upload_to_course boolean NOT NULL DEFAULT false,
  linked_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Recurrence rules (Google Calendar style)
CREATE TABLE public.workshop_recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  frequency text NOT NULL DEFAULT 'weekly', -- daily, weekly, monthly, yearly, custom
  interval_value integer NOT NULL DEFAULT 1, -- every X days/weeks/months
  days_of_week text[] DEFAULT '{}', -- mon,tue,wed...
  month_day integer, -- for monthly: day of month (1-31)
  month_week_day text, -- for monthly: e.g. '3rd_saturday'
  end_type text NOT NULL DEFAULT 'never', -- never, on_date, after_occurrences
  end_date date,
  occurrence_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Individual occurrences (generated from recurrence rules or single events)
CREATE TABLE public.workshop_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  occurrence_number integer NOT NULL DEFAULT 1,
  total_occurrences integer,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming', -- upcoming, live, completed, cancelled
  meeting_link text,
  recording_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Attendees tracking
CREATE TABLE public.workshop_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.workshop_occurrences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz,
  left_at timestamptz,
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(occurrence_id, user_id)
);

-- Recordings
CREATE TABLE public.workshop_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.workshop_occurrences(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  recording_url text,
  duration_seconds integer,
  uploaded_to_course boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_recordings ENABLE ROW LEVEL SECURITY;

-- Workshops policies
CREATE POLICY "Coaches manage own workshops" ON public.workshops FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Students can view workshops" ON public.workshops FOR SELECT
  USING (status = 'active');

-- Recurrence rules policies
CREATE POLICY "Coaches manage own recurrence rules" ON public.workshop_recurrence_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.created_by = auth.uid()));

CREATE POLICY "Anyone can view recurrence rules" ON public.workshop_recurrence_rules FOR SELECT
  USING (true);

-- Occurrences policies
CREATE POLICY "Coaches manage own occurrences" ON public.workshop_occurrences FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.created_by = auth.uid()));

CREATE POLICY "Anyone can view occurrences" ON public.workshop_occurrences FOR SELECT
  USING (true);

-- Attendees policies
CREATE POLICY "Users manage own attendance" ON public.workshop_attendees FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches view attendees" ON public.workshop_attendees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workshop_occurrences wo
    JOIN public.workshops w ON w.id = wo.workshop_id
    WHERE wo.id = occurrence_id AND w.created_by = auth.uid()
  ));

-- Recordings policies
CREATE POLICY "Coaches manage recordings" ON public.workshop_recordings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workshops w WHERE w.id = workshop_id AND w.created_by = auth.uid()));

CREATE POLICY "Anyone can view recordings" ON public.workshop_recordings FOR SELECT
  USING (true);
