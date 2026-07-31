
-- Partnership requests table
CREATE TABLE public.partnership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  program_id uuid NOT NULL REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  custom_commission numeric,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(requester_id, program_id)
);
ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

-- Requester can view own requests
CREATE POLICY "Users view own requests" ON public.partnership_requests
  FOR SELECT TO authenticated USING (requester_id = auth.uid());

-- Program owners can view requests for their programs
CREATE POLICY "Program owners view requests" ON public.partnership_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM affiliate_programs ap
    LEFT JOIN courses c ON c.id = ap.course_id
    LEFT JOIN services s ON s.id = ap.service_id
    WHERE ap.id = partnership_requests.program_id
      AND (c.coach_id = auth.uid() OR s.coach_id = auth.uid())
  ));

-- Users can create requests
CREATE POLICY "Users create requests" ON public.partnership_requests
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());

-- Program owners can update (approve/reject)
CREATE POLICY "Program owners update requests" ON public.partnership_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM affiliate_programs ap
    LEFT JOIN courses c ON c.id = ap.course_id
    LEFT JOIN services s ON s.id = ap.service_id
    WHERE ap.id = partnership_requests.program_id
      AND (c.coach_id = auth.uid() OR s.coach_id = auth.uid())
  ));

-- Add niche/bio fields to profiles for coach discovery
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS niche text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
