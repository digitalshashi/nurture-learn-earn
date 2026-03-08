
-- Add access_level to courses (Free, Silver, Gold, Diamond)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'free';

-- Add display_order to courses for coach reordering
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Add service_level to profiles for student tier
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_level text NOT NULL DEFAULT 'free';
