-- Coach-configurable attendance points, and a record of who marked
-- themselves present at an event, so "Mark Present" can award XP exactly
-- once per member per event.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS attendance_points integer NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS public.event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  -- One row per member per event; keeps "Mark Present" idempotent so a
  -- double click (or a re-render) can't double-award XP.
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_attendance_user_idx
  ON public.event_attendance (user_id);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- Members mark only their own attendance. Mirrors event_registrations:
-- self-insert conveys no paid access, just an attendance record.
DROP POLICY IF EXISTS "Members manage own event attendance" ON public.event_attendance;
CREATE POLICY "Members manage own event attendance"
  ON public.event_attendance
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Coaches see the attendance list for events they created.
DROP POLICY IF EXISTS "Coaches view attendance for their events" ON public.event_attendance;
CREATE POLICY "Coaches view attendance for their events"
  ON public.event_attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_attendance.event_id
        AND e.created_by = auth.uid()
    )
  );
