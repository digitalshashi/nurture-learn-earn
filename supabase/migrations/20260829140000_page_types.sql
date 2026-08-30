-- Page kinds, and the ability to attach one to a service.
--
-- A checkout page and an order-confirmation page are not landing pages: they
-- have required elements (an order summary, what happens next) that a generic
-- prompt will not produce reliably. Recording the kind lets the generator ask
-- for the right thing, and lets a service point at the page it should use.

ALTER TABLE public.builder_pages
  ADD COLUMN IF NOT EXISTS page_type text NOT NULL DEFAULT 'landing';

ALTER TABLE public.builder_pages
  DROP CONSTRAINT IF EXISTS builder_pages_type_check;

ALTER TABLE public.builder_pages
  ADD CONSTRAINT builder_pages_type_check
  CHECK (page_type IN ('landing', 'checkout', 'success', 'sales', 'webinar', 'thank_you'));

-- Which service this page belongs to, when it is a checkout or confirmation
-- page. Null for a standalone landing page.
ALTER TABLE public.builder_pages
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS builder_pages_service_idx
  ON public.builder_pages (service_id, page_type) WHERE service_id IS NOT NULL;

-- At most one published page per service per kind, so the checkout flow never
-- has to guess which of two confirmation pages to render.
CREATE UNIQUE INDEX IF NOT EXISTS builder_pages_service_type_uniq
  ON public.builder_pages (service_id, page_type)
  WHERE service_id IS NOT NULL AND status = 'published';

COMMENT ON COLUMN public.builder_pages.page_type IS
  'What the page is for. Drives the AI brief and where the page is used.';

-- The anon projection needs these so a public checkout can find its page.
GRANT SELECT (page_type, service_id) ON public.builder_pages TO anon;
