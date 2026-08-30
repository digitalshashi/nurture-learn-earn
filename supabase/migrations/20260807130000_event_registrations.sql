-- Registrations for coach-created events, so members get a "My Events" view.
-- Workshop occurrences already have workshop_attendees; this is the equivalent
-- for the events table, and the UI reads both.

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  -- One row per member per event; makes register/cancel idempotent and lets
  -- the client upsert without racing itself on a double click.
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_registrations_user_idx
  ON public.event_registrations (user_id);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Members manage only their own registration. Registering conveys no paid
-- access — the meeting link is already on the event row for anyone who can see
-- it — so self-insert is safe here, unlike service_users/enrollments.
DROP POLICY IF EXISTS "Members manage own event registrations" ON public.event_registrations;
CREATE POLICY "Members manage own event registrations"
  ON public.event_registrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Coaches see the attendee list for events they created.
DROP POLICY IF EXISTS "Coaches view registrations for their events" ON public.event_registrations;
CREATE POLICY "Coaches view registrations for their events"
  ON public.event_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_registrations.event_id
        AND e.created_by = auth.uid()
    )
  );
