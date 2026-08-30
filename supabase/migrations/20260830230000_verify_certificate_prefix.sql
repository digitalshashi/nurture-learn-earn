-- Asserts the prefix rules against literals, before a real certificate uses them.
--
-- brand_prefix is pure precisely so this can check it without inserting a
-- coach, a template and a certificate to find out.

DO $$
DECLARE
  got text;
BEGIN
  -- An academy's own name reads as its initials.
  got := public.brand_prefix('Bright Path Academy');
  IF got <> 'BPA' THEN RAISE EXCEPTION 'Bright Path Academy gave %, expected BPA', got; END IF;

  -- Punctuation and extra spacing must not change the answer.
  IF public.brand_prefix('Bright-Path   Academy!') <> 'BPA' THEN
    RAISE EXCEPTION 'Punctuation changed the prefix.';
  END IF;

  -- A single word falls back to its first three characters.
  IF public.brand_prefix('1corehub') <> '1CO' THEN
    RAISE EXCEPTION '1corehub gave %', public.brand_prefix('1corehub');
  END IF;

  -- Never empty: an empty prefix would produce ids like '-2026-000001'.
  IF public.brand_prefix('') <> '1CH' THEN RAISE EXCEPTION 'Empty name gave no fallback.'; END IF;
  IF public.brand_prefix(NULL) <> '1CH' THEN RAISE EXCEPTION 'NULL name gave no fallback.'; END IF;
  IF public.brand_prefix('!!!') <> '1CH' THEN RAISE EXCEPTION 'Punctuation-only gave no fallback.'; END IF;

  -- A certificate with no template is this platform's.
  IF public.certificate_prefix(NULL) <> '1CH' THEN
    RAISE EXCEPTION 'A template-less certificate did not fall back to 1CH.';
  END IF;

  -- And the trigger still emits nothing from the old brand.
  SELECT prosrc INTO got FROM pg_proc WHERE proname = 'generate_certificate_id';
  IF got LIKE '%ILH-%' OR got LIKE '%CERT-%' THEN
    RAISE EXCEPTION 'The id generator still carries an old prefix.';
  END IF;

  RAISE NOTICE 'Certificate prefixes: 1CH by default, academy initials where a brand is set.';
END $$;
