-- Put pgcrypto where migrations can see it.
--
-- Installing it into the extensions schema is the Supabase convention, but a
-- migration runs with search_path = public, so gen_random_bytes() was still
-- unresolved. Moving the extension makes it callable unqualified.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    ALTER EXTENSION pgcrypto SET SCHEMA public;
  ELSE
    CREATE EXTENSION pgcrypto WITH SCHEMA public;
  END IF;
END $$;
