-- gen_random_bytes() lives in pgcrypto, which was not enabled.
--
-- 20260829120000_white_label_domains.sql defaults a verification token to
-- encode(gen_random_bytes(16), 'hex') and failed to apply without it. Enabling
-- the extension here rather than editing that migration keeps its history
-- intact.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
