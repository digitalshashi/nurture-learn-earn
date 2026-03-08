
ALTER TABLE public.events ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;
