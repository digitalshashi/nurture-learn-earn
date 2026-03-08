
-- Certificate templates (coach-created)
CREATE TABLE public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  template_style text NOT NULL DEFAULT 'classic',
  trigger_type text NOT NULL DEFAULT 'course_completed',
  linked_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  linked_section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  linked_service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  certificate_text text DEFAULT 'This certificate is awarded to {student_name} for successfully completing {course_name}',
  logo_url text,
  signature_url text,
  background_color text DEFAULT '#ffffff',
  accent_color text DEFAULT '#1a1a2e',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own certificates"
  ON public.certificate_templates FOR ALL TO authenticated
  USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view active certificates"
  ON public.certificate_templates FOR SELECT TO authenticated
  USING (is_active = true);

-- Issued certificates (auto or manual)
CREATE TABLE public.issued_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id text NOT NULL,
  template_id uuid NOT NULL REFERENCES public.certificate_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  student_name text NOT NULL,
  course_name text,
  service_name text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own certificates"
  ON public.issued_certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Coaches manage issued certificates"
  ON public.issued_certificates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin'));

-- Sequence for certificate IDs
CREATE SEQUENCE public.certificate_id_seq START 1;

-- Function to generate certificate ID
CREATE OR REPLACE FUNCTION public.generate_certificate_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.certificate_id := 'ILH-' || EXTRACT(YEAR FROM now())::text || '-' || lpad(nextval('public.certificate_id_seq')::text, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_certificate_id
  BEFORE INSERT ON public.issued_certificates
  FOR EACH ROW
  WHEN (NEW.certificate_id = '' OR NEW.certificate_id IS NULL)
  EXECUTE FUNCTION public.generate_certificate_id();

-- Function to auto-award certificates on course completion
CREATE OR REPLACE FUNCTION public.auto_award_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_total int;
  v_completed int;
  v_student_name text;
  v_course_title text;
BEGIN
  -- Only process completed chapters
  IF NEW.completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Get the course_id from chapter -> section -> course
  FOR rec IN
    SELECT ct.id as template_id, ct.trigger_type, ct.linked_course_id, ct.linked_section_id,
           s.course_id, ch.section_id
    FROM public.chapters ch
    JOIN public.sections s ON s.id = ch.section_id
    JOIN public.certificate_templates ct ON ct.is_active = true
      AND (ct.linked_course_id = s.course_id OR ct.linked_section_id = ch.section_id)
    WHERE ch.id = NEW.chapter_id
  LOOP
    -- Check course completion
    IF rec.trigger_type = 'course_completed' AND rec.linked_course_id IS NOT NULL THEN
      SELECT count(*) INTO v_total
      FROM public.chapters c2
      JOIN public.sections s2 ON s2.id = c2.section_id
      WHERE s2.course_id = rec.linked_course_id;

      SELECT count(*) INTO v_completed
      FROM public.chapter_progress cp
      JOIN public.chapters c2 ON c2.id = cp.chapter_id
      JOIN public.sections s2 ON s2.id = c2.section_id
      WHERE s2.course_id = rec.linked_course_id
        AND cp.user_id = NEW.user_id
        AND cp.completed = true;

      IF v_total > 0 AND v_completed >= v_total THEN
        SELECT full_name INTO v_student_name FROM public.profiles WHERE id = NEW.user_id;
        SELECT title INTO v_course_title FROM public.courses WHERE id = rec.linked_course_id;

        INSERT INTO public.issued_certificates (certificate_id, template_id, user_id, student_name, course_name)
        VALUES ('', rec.template_id, NEW.user_id, COALESCE(v_student_name, 'Student'), v_course_title)
        ON CONFLICT (template_id, user_id) DO NOTHING;
      END IF;
    END IF;

    -- Check section completion
    IF rec.trigger_type = 'section_completed' AND rec.linked_section_id IS NOT NULL THEN
      SELECT count(*) INTO v_total
      FROM public.chapters c2 WHERE c2.section_id = rec.linked_section_id;

      SELECT count(*) INTO v_completed
      FROM public.chapter_progress cp
      JOIN public.chapters c2 ON c2.id = cp.chapter_id
      WHERE c2.section_id = rec.linked_section_id
        AND cp.user_id = NEW.user_id
        AND cp.completed = true;

      IF v_total > 0 AND v_completed >= v_total THEN
        SELECT full_name INTO v_student_name FROM public.profiles WHERE id = NEW.user_id;

        INSERT INTO public.issued_certificates (certificate_id, template_id, user_id, student_name)
        VALUES ('', rec.template_id, NEW.user_id, COALESCE(v_student_name, 'Student'))
        ON CONFLICT (template_id, user_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_award_cert_on_progress
  AFTER INSERT OR UPDATE ON public.chapter_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_award_certificate();

-- Enable realtime for issued_certificates
ALTER PUBLICATION supabase_realtime ADD TABLE public.issued_certificates;
