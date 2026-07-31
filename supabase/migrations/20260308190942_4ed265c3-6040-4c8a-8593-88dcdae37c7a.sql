
-- Add access_type column to service_users
ALTER TABLE public.service_users ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'payment';
ALTER TABLE public.service_users ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.service_users ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.service_users ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Customer notes table
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  note text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage customer notes"
  ON public.customer_notes FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin')
  );
