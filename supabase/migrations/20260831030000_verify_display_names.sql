-- Proves nobody is nameless, and cannot become nameless again.

DO $$
DECLARE
  blanks integer;
  has_trigger boolean;
BEGIN
  SELECT count(*) INTO blanks
  FROM public.profiles
  WHERE btrim(coalesce(full_name, '')) = '';

  IF blanks > 0 THEN
    RAISE EXCEPTION '% profiles still have no name to show.', blanks;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'profiles_fill_display_name' AND NOT tgisinternal
  ) INTO has_trigger;

  IF NOT has_trigger THEN
    RAISE EXCEPTION 'Nothing stops the next blank name being written.';
  END IF;

  -- The derivation itself, against literals.
  IF public.profile_display_name('Priya Sharma', 'x@y.com') <> 'Priya Sharma' THEN
    RAISE EXCEPTION 'A real name was not preserved.';
  END IF;
  IF public.profile_display_name('', 'alex.fernandes@example.com') <> 'Alex Fernandes' THEN
    RAISE EXCEPTION 'Email derivation gave %', public.profile_display_name('', 'alex.fernandes@example.com');
  END IF;
  IF public.profile_display_name(NULL, NULL) <> 'Member' THEN
    RAISE EXCEPTION 'No fallback of last resort.';
  END IF;

  RAISE NOTICE 'Every profile has a display name, and the trigger keeps it that way.';
END $$;
