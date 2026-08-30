-- Every member has a name to show.
--
-- handle_new_user writes full_name as COALESCE(metadata->>'full_name', ''), so
-- anyone who signed up without that metadata — an emailed one-time code, an
-- account created for a buyer at checkout, an imported customer — got an empty
-- string. The feed renders `full_name || "Unknown"` and messages render
-- `full_name || "Member"`, and an empty string is falsy, so those people showed
-- up as strangers to everyone including themselves.
--
-- Fixed on the profiles table rather than inside handle_new_user: that function
-- is being extended elsewhere (referral signup rewards), and replacing it whole
-- to change two lines would mean owning every other change made to it. A
-- trigger here also covers profiles created by any path that never went through
-- the signup hook at all.

-- ── Deriving something sayable ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.profile_display_name(full_name text, email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  local_part text;
BEGIN
  -- A real name always wins.
  IF btrim(coalesce(full_name, '')) <> '' THEN
    RETURN btrim(full_name);
  END IF;

  local_part := split_part(coalesce(email, ''), '@', 1);
  IF btrim(local_part) = '' THEN
    RETURN 'Member';
  END IF;

  -- alex.fernandes -> Alex Fernandes. Better than an address, and much better
  -- than "Unknown" next to someone's own post.
  RETURN initcap(btrim(regexp_replace(local_part, '[._\-+0-9]+', ' ', 'g')));
END;
$$;

-- ── Applied whenever a profile is written ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.fill_profile_display_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF btrim(coalesce(NEW.full_name, '')) = '' THEN
    NEW.full_name := public.profile_display_name(NEW.full_name, NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_fill_display_name ON public.profiles;

CREATE TRIGGER profiles_fill_display_name
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fill_profile_display_name();

-- ── The people already showing as strangers ────────────────────────────────
--
-- Only the blank ones. A name someone actually chose is never overwritten.

UPDATE public.profiles
SET full_name = public.profile_display_name(full_name, email),
    updated_at = now()
WHERE btrim(coalesce(full_name, '')) = '';
