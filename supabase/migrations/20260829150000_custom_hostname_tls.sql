-- Registering a white-label hostname with the edge, so TLS terminates for it.
--
-- DNS verification proves the domain is the coach's and that it points here.
-- It does not make it serve: until the hostname is registered with Cloudflare
-- for SaaS there is no certificate for it, and a browser refuses the
-- connection before any of our code runs. These columns track that second half.

ALTER TABLE public.domain_settings
  -- Cloudflare's id for the custom hostname, so we update rather than
  -- re-create on a repeated check.
  ADD COLUMN IF NOT EXISTS cf_hostname_id text,
  -- Certificate state as Cloudflare reports it: pending_validation, active,
  -- pending_issuance, and the various failure states.
  ADD COLUMN IF NOT EXISTS ssl_status text,
  -- Set when the edge is not configured for custom hostnames at all, so the
  -- screen can say "verified, not yet served" instead of implying failure.
  ADD COLUMN IF NOT EXISTS ssl_error text;

-- The owner reads these to see whether their domain is live yet; anon has no
-- business knowing our edge's internal ids.
GRANT SELECT (
  id, coach_id, domain, status, verified_at, is_live,
  verification_token, cname_target, last_checked_at, last_error,
  cf_hostname_id, ssl_status, ssl_error,
  created_at, updated_at
) ON public.domain_settings TO authenticated;
