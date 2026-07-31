-- Support service-based affiliate programs
ALTER TABLE public.affiliate_programs
  ADD COLUMN IF NOT EXISTS service_id uuid;

ALTER TABLE public.affiliate_programs
  ALTER COLUMN course_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_programs_service_id_fkey'
  ) THEN
    ALTER TABLE public.affiliate_programs
      ADD CONSTRAINT affiliate_programs_service_id_fkey
      FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'affiliate_programs_course_or_service_required'
  ) THEN
    ALTER TABLE public.affiliate_programs
      ADD CONSTRAINT affiliate_programs_course_or_service_required
      CHECK (course_id IS NOT NULL OR service_id IS NOT NULL);
  END IF;
END $$;

DROP POLICY IF EXISTS "Coaches can manage programs" ON public.affiliate_programs;

CREATE POLICY "Coaches can manage programs"
ON public.affiliate_programs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = affiliate_programs.course_id
      AND c.coach_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = affiliate_programs.service_id
      AND s.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = affiliate_programs.course_id
      AND c.coach_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = affiliate_programs.service_id
      AND s.coach_id = auth.uid()
  )
);