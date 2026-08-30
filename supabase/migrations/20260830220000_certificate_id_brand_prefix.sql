-- Put this platform's name on its certificates — and the coach's on theirs.
--
-- The prefix was 'CERT-', chosen because a certificate is awarded by a coach's
-- academy rather than by the platform underneath it, and stamping one brand on
-- every academy's certificate is what went wrong with 'ILH-'. Asked for the
-- 1corehub name, this does both: the platform's certificates carry 1CH, and a
-- coach who has set a brand of their own gets theirs.
--
-- Ids already issued are untouched. The running sequence is untouched too, so
-- uniqueness never depended on the prefix and still does not — two academies
-- can share initials without ever colliding.

-- ── Deriving a prefix from a name ──────────────────────────────────────────
--
-- Pure and separate from the lookup so it can be asserted against literals in
-- the verification migration, without inserting a coach to test with.

CREATE OR REPLACE FUNCTION public.brand_prefix(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  words   text[];
  result  text;
BEGIN
  -- Anything that is not a letter, a digit or a gap becomes a gap, so
  -- "Bright-Path Academy!" and "Bright Path Academy" agree.
  cleaned := btrim(regexp_replace(coalesce(name, ''), '[^a-zA-Z0-9]+', ' ', 'g'));

  IF cleaned = '' THEN
    RETURN '1CH';
  END IF;

  words := regexp_split_to_array(cleaned, '\s+');

  IF array_length(words, 1) >= 2 THEN
    -- Initials read as an abbreviation of the name: "Bright Path Academy" is
    -- recognisably BPA in a way that BRI is not.
    result := upper(
      substr(words[1], 1, 1)
      || substr(words[2], 1, 1)
      || coalesce(substr(words[3], 1, 1), '')
    );
  ELSE
    result := upper(substr(cleaned, 1, 3));
  END IF;

  -- Never empty: an empty prefix would produce '-2026-000001'.
  RETURN coalesce(nullif(btrim(result), ''), '1CH');
END;
$$;

-- ── The prefix for whoever issued this certificate ─────────────────────────

CREATE OR REPLACE FUNCTION public.certificate_prefix(template uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  brand text;
BEGIN
  IF template IS NULL THEN
    RETURN '1CH';
  END IF;

  SELECT coalesce(nullif(btrim(ps.brand_name), ''), nullif(btrim(ps.product_name), ''))
  INTO brand
  FROM public.certificate_templates ct
  JOIN public.platform_settings ps ON ps.coach_id = ct.coach_id
  WHERE ct.id = template;

  -- No academy brand set is the normal case, and it means this platform's.
  IF brand IS NULL THEN
    RETURN '1CH';
  END IF;

  RETURN public.brand_prefix(brand);
END;
$$;

-- ── The trigger ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_certificate_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.certificate_id := public.certificate_prefix(NEW.template_id)
    || '-'
    || EXTRACT(YEAR FROM now())::text
    || '-'
    || lpad(nextval('public.certificate_id_seq')::text, 6, '0');
  RETURN NEW;
END;
$$;
