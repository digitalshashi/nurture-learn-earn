-- One platform currency, and it is authoritative.
--
-- coach_payment_settings.default_currency existed but nothing ever read it, so
-- the UI hardcoded a symbol instead — mostly "$" — regardless of what a coach
-- actually charged in. This puts the setting where the rest of the workspace
-- branding lives and gives the app a single value to format against.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'INR';

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_currency_check;

ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_currency_check
  CHECK (default_currency IN ('INR', 'EUR', 'USD'));

COMMENT ON COLUMN public.platform_settings.default_currency IS
  'Currency the workspace prices and reports in. Drives every symbol in the UI.';

-- Services created before this defaulted to whatever the form happened to send.
-- Anything left blank follows the platform.
UPDATE public.services SET currency = 'INR' WHERE currency IS NULL OR currency = '';
