-- Turning on affiliates from the service itself.
--
-- The affiliates dashboard shipped with a trap in it: a service only became
-- promotable if somebody first created an affiliate_programs row on a separate
-- screen. Nobody had, so every affiliate opened the dashboard to "No
-- memberships to promote yet" and reasonably concluded the feature was broken.
--
-- The fix is to put the switch where the thing being sold already lives. A
-- coach opens one of their services, sets a commission rate, and the programme,
-- the product and their own shareable link all come into existence in one call.
-- No second screen, and no order of operations to get wrong.

-- ---------------------------------------------------------------- one each --

-- One affiliate programme per service, which the original schema never said.
-- Two programmes for one service means two cards for the same thing and an
-- arbitrary choice of commission rate at sale time, so the duplicates go: the
-- most generous survives, since that is the rate an affiliate was told.
DELETE FROM public.affiliate_programs a
USING public.affiliate_programs b
WHERE a.service_id IS NOT NULL
  AND a.service_id = b.service_id
  AND (
    a.commission_percent < b.commission_percent
    OR (a.commission_percent = b.commission_percent AND a.created_at > b.created_at)
    OR (a.commission_percent = b.commission_percent AND a.created_at = b.created_at AND a.id > b.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_programs_service_uniq
  ON public.affiliate_programs (service_id)
  WHERE service_id IS NOT NULL;

-- ------------------------------------------------------------- the caller's --

/**
 * The caller's own link for one product, minted on first ask.
 *
 * Extracted from affiliate_products_for_me() so a coach who has just switched
 * a single service on gets their link back from the same call, rather than
 * having to load the whole dashboard to discover it.
 */
CREATE OR REPLACE FUNCTION public.my_affiliate_link(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me      uuid := auth.uid();
  v_code  text;
  product record;
  link    record;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to get an affiliate link';
  END IF;

  SELECT * INTO product FROM public.affiliate_products WHERE id = _product_id;
  IF product.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_code := public.my_referral_code();

  INSERT INTO public.affiliate_links (
    user_id, product_id, program_id, referral_code, affiliate_code, full_url
  )
  VALUES (
    me, product.id, product.program_id,
    v_code || '-' || left(replace(product.id::text, '-', ''), 8),
    v_code,
    product.checkout_base_url || '?affiliate=' || v_code
  )
  ON CONFLICT (user_id, product_id) WHERE product_id IS NOT NULL DO NOTHING;

  -- Repair a link minted before the service was renamed or re-slugged.
  UPDATE public.affiliate_links al
     SET affiliate_code = v_code,
         full_url       = product.checkout_base_url || '?affiliate=' || v_code
   WHERE al.user_id = me
     AND al.product_id = product.id
     AND (
       al.affiliate_code IS DISTINCT FROM v_code
       OR al.full_url IS DISTINCT FROM product.checkout_base_url || '?affiliate=' || v_code
     );

  SELECT * INTO link
  FROM public.affiliate_links
  WHERE user_id = me AND product_id = product.id;

  RETURN jsonb_build_object(
    'product_id',     product.id,
    'name',           product.name,
    'affiliate_code', link.affiliate_code,
    'full_url',       link.full_url,
    'clicks',         COALESCE(link.clicks, 0)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.my_affiliate_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_affiliate_link(uuid) TO authenticated;

-- ------------------------------------------------------------- the reading --

/**
 * GET — what the affiliate switch on a service currently says.
 *
 * Readable by the service's owner and by staff. It reports the rate and the
 * caller's link, but no other affiliate's figures: a coach seeing how their
 * own link performs is fine, a coach reading a member's earnings is not.
 */
CREATE OR REPLACE FUNCTION public.service_affiliate_status(_service_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me      uuid := auth.uid();
  svc     record;
  product record;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to view affiliate settings';
  END IF;

  SELECT id, title, coach_id INTO svc FROM public.services WHERE id = _service_id;
  IF svc.id IS NULL THEN
    RAISE EXCEPTION 'That service does not exist';
  END IF;

  IF svc.coach_id <> me
     AND NOT (public.has_role(me, 'admin') OR public.has_role(me, 'super_admin')) THEN
    RAISE EXCEPTION 'You can only manage affiliates for your own services';
  END IF;

  SELECT * INTO product
  FROM public.affiliate_products
  WHERE service_id = _service_id
  ORDER BY commission_rate DESC, created_at
  LIMIT 1;

  IF product.id IS NULL THEN
    RETURN jsonb_build_object(
      'service_id', svc.id,
      'title',      svc.title,
      'enabled',    false,
      -- What the switch proposes the first time it is opened. A rate of zero
      -- would create a programme that pays nobody, which is not a default.
      'commission_rate', 10
    );
  END IF;

  RETURN jsonb_build_object(
    'service_id',        svc.id,
    'title',             svc.title,
    'enabled',           product.active,
    'commission_rate',   product.commission_rate,
    'product_id',        product.id,
    'checkout_base_url', product.checkout_base_url,
    'link',              public.my_affiliate_link(product.id),
    'affiliates',        (SELECT count(DISTINCT user_id) FROM public.affiliate_links WHERE product_id = product.id),
    'clicks',            (SELECT COALESCE(sum(clicks), 0) FROM public.affiliate_links WHERE product_id = product.id),
    'sales_count',       (SELECT count(*) FROM public.affiliate_sales WHERE product_id = product.id),
    'commission_total',  (SELECT COALESCE(sum(commission_earned), 0) FROM public.affiliate_sales WHERE product_id = product.id)
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.service_affiliate_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.service_affiliate_status(uuid) TO authenticated;

-- ------------------------------------------------------------- the writing --

/**
 * PUT — switch affiliates on or off for one service, and set the rate.
 *
 * Creates the programme if there is none. The sync trigger from the affiliate
 * dashboard migration turns that into an affiliate_products row, so the caller
 * gets a working link back from this one call.
 *
 * Turning it off deactivates the product rather than deleting anything:
 * commission already earned is a debt, and the sales behind it have to keep
 * their product name. Existing links stop paying; they do not 404.
 */
CREATE OR REPLACE FUNCTION public.set_service_affiliate(
  _service_id      uuid,
  _commission_rate numeric,
  _active          boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me   uuid := auth.uid();
  svc  record;
  rate numeric := round(COALESCE(_commission_rate, 0)::numeric, 2);
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage affiliates';
  END IF;

  SELECT id, coach_id INTO svc FROM public.services WHERE id = _service_id;
  IF svc.id IS NULL THEN
    RAISE EXCEPTION 'That service does not exist';
  END IF;

  IF svc.coach_id <> me
     AND NOT (public.has_role(me, 'admin') OR public.has_role(me, 'super_admin')) THEN
    RAISE EXCEPTION 'You can only manage affiliates for your own services';
  END IF;

  IF rate < 0 OR rate > 100 THEN
    RAISE EXCEPTION 'Commission rate must be between 0 and 100';
  END IF;

  INSERT INTO public.affiliate_programs (service_id, commission_percent, commission_type, is_active)
  VALUES (_service_id, rate, 'percentage', COALESCE(_active, true))
  ON CONFLICT (service_id) WHERE service_id IS NOT NULL
  DO UPDATE SET
    commission_percent = EXCLUDED.commission_percent,
    is_active          = EXCLUDED.is_active;

  RETURN public.service_affiliate_status(_service_id);
END;
$fn$;

REVOKE ALL ON FUNCTION public.set_service_affiliate(uuid, numeric, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_service_affiliate(uuid, numeric, boolean) TO authenticated;

-- ------------------------------------------------------------ the listing --

/**
 * Which of the caller's services have affiliates switched on.
 *
 * One call for the whole Services table, so the list does not fire a status
 * query per row.
 */
CREATE OR REPLACE FUNCTION public.my_service_affiliate_rates()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $fn$
  SELECT COALESCE(
    jsonb_object_agg(
      p.service_id::text,
      jsonb_build_object('enabled', p.active, 'commission_rate', p.commission_rate)
    ),
    '{}'::jsonb
  )
  FROM public.affiliate_products p
  JOIN public.services s ON s.id = p.service_id
  WHERE s.coach_id = auth.uid()
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'super_admin');
$fn$;

REVOKE ALL ON FUNCTION public.my_service_affiliate_rates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_service_affiliate_rates() TO authenticated;
