-- Which gateways a coach offers, readable by the people who need to know.
--
-- The checkout page has to render the payment options before it can take any
-- money, and it read coach_payment_gateways directly. The only public policy
-- on that table is "Anyone can see which gateways a coach offers" — and that
-- policy is FOR SELECT TO anon. Which covers a logged-out visitor browsing the
-- page, and nobody else: the moment a buyer signs in to actually pay they
-- become `authenticated`, match no policy, and the page concludes the coach
-- has no gateway connected. Checkout worked right up until someone tried to
-- buy something.
--
-- Adding an authenticated policy to the base table would be the wrong fix.
-- Column privileges there let `authenticated` read key_id — which a coach
-- needs on their own settings page, but which nobody should get for every
-- coach on the platform. A row policy cannot narrow columns; a view can.
--
-- This view runs with the owner's rights (security_invoker = false, the
-- PostgreSQL default) so it can serve one curated projection to everyone
-- without granting anyone access to the table behind it. It deliberately
-- exposes strictly less than the anon policy already did — no id, no key_id.

CREATE OR REPLACE VIEW public.coach_payment_methods AS
SELECT
  g.coach_id,
  g.provider,
  g.environment,
  g.currency,
  g.is_default
FROM public.coach_payment_gateways g
WHERE g.is_enabled
  -- Only gateways that could actually take a payment. The checkout page used
  -- to assume every enabled row was configured, so a half-connected gateway
  -- was offered to the buyer and failed at the point of paying instead.
  AND g.key_id IS NOT NULL AND length(g.key_id) > 0
  AND g.key_secret IS NOT NULL AND length(g.key_secret) > 0;

ALTER VIEW public.coach_payment_methods SET (security_invoker = false);

GRANT SELECT ON public.coach_payment_methods TO anon, authenticated;
