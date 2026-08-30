-- The affiliate dashboard, and the data that makes it true.
--
-- Two half-systems existed before this. /referral had a real Refer & Earn
-- programme — codes, visits, a signup trigger, a purchase trigger, thirty-day
-- attribution — all of it wired. /affiliate had the three-tab dashboard shape
-- (Memberships, Sales, Payments) drawn over tables from the original build
-- that nothing ever wrote to, with filters that filtered nothing and a
-- "Membership" column hardcoded to the string "Course".
--
-- This migration makes the second one real by borrowing the first one's
-- machinery rather than duplicating it:
--
--   * A member's affiliate code IS their referral code. One identity, so a
--     link already shared keeps working and the two screens never disagree
--     about who somebody is.
--   * The attribution window is referral_program.attribution_days, the same
--     number the Refer & Earn page shows. Changing it changes both.
--
-- The chain a commission has to survive is longer than a referral's, because
-- the buyer is often already a member and there is no signup to hang the
-- attribution on:
--
--   click (anonymous)  ->  attribution (per user, per product, expiring)
--                      ->  transaction  ->  affiliate_sales row  ->  payout
--
-- Three security defects in the old schema are fixed here, and they are the
-- reason this could not simply be a UI change:
--
--   1. affiliate_sales allowed INSERT ... WITH CHECK (true) to any signed-in
--      user. Anyone could write their own commission rows.
--   2. affiliate_clicks allowed the same, so anyone could inflate any link.
--   3. affiliate_bank_details stored account numbers in plaintext, readable
--      back by the account owner and by anything holding their token.

-- ===========================================================================
-- 1. Key material for the bank details
-- ===========================================================================

-- Outside `public`, so PostgREST — which is only ever configured to expose
-- public and graphql_public — has no route to it at all. Belt and braces on
-- top of the revoked grants below.
CREATE SCHEMA IF NOT EXISTS secure;
REVOKE ALL ON SCHEMA secure FROM PUBLIC;

CREATE TABLE IF NOT EXISTS secure.crypto_keys (
  name       text PRIMARY KEY,
  key        text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON secure.crypto_keys FROM PUBLIC;

COMMENT ON TABLE secure.crypto_keys IS
  'Symmetric keys for column encryption. Never selected by a client role; only public.* SECURITY DEFINER functions read it. Move to Supabase Vault or an external KMS if key/data separation is required.';

/**
 * The key that bank details are encrypted with, minted once on first use.
 *
 * Prefers Supabase Vault when the extension is installed, because there the
 * key is sealed with the project root key and lives outside the table it
 * protects. Falls back to secure.crypto_keys so this migration applies on a
 * project without Vault rather than failing halfway through.
 *
 * The key is never regenerated: a second key would leave every existing
 * ciphertext undecryptable, which is worse than no rotation at all. Rotation
 * means decrypt-with-old, encrypt-with-new, and is a deliberate operation.
 */
CREATE OR REPLACE FUNCTION secure.bank_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = secure, public
AS $fn$
DECLARE
  k text;
BEGIN
  BEGIN
    EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1'
      INTO k USING 'affiliate_bank_key';
  EXCEPTION WHEN undefined_table OR undefined_object OR insufficient_privilege THEN
    k := NULL;
  END;
  IF k IS NOT NULL AND k <> '' THEN
    RETURN k;
  END IF;

  SELECT key INTO k FROM secure.crypto_keys WHERE name = 'affiliate_bank_key';
  IF k IS NULL THEN
    -- ON CONFLICT rather than check-then-insert: two members opening the bank
    -- form at the same moment must not mint two different keys.
    INSERT INTO secure.crypto_keys (name, key)
    VALUES ('affiliate_bank_key', encode(public.gen_random_bytes(32), 'base64'))
    ON CONFLICT (name) DO NOTHING;
    SELECT key INTO k FROM secure.crypto_keys WHERE name = 'affiliate_bank_key';
  END IF;

  RETURN k;
END;
$fn$;

REVOKE ALL ON FUNCTION secure.bank_key() FROM PUBLIC;

-- ===========================================================================
-- 2. affiliate_products — the commission layer over what is already sold
-- ===========================================================================

-- Deliberately not a second catalogue. A row here is the commission terms for
-- an existing affiliate_programs row, which in turn points at a course or a
-- service that already has a price, a checkout page and an owner. Coaches keep
-- managing offers where they always did; this table is what an affiliate sees.
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid UNIQUE REFERENCES public.affiliate_programs(id) ON DELETE CASCADE,

  -- Denormalised from the programme so the transaction trigger can resolve a
  -- product from a sale with one index hit instead of a three-table join.
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  course_id  uuid REFERENCES public.courses(id) ON DELETE CASCADE,

  name text NOT NULL,

  commission_rate  numeric NOT NULL DEFAULT 0
    CHECK (commission_rate >= 0 AND commission_rate <= 100),
  -- One value today. Kept as a checked text column rather than assumed, so
  -- adding 'gross_sale' later is a migration and not an archaeology exercise.
  commission_basis text NOT NULL DEFAULT 'actual_earning'
    CHECK (commission_basis IN ('actual_earning')),

  -- A path, not an absolute URL. This platform serves white-label domains, so
  -- the origin belongs to whoever is looking — the browser prefixes its own.
  checkout_base_url text NOT NULL,

  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_products_service_idx
  ON public.affiliate_products (service_id) WHERE service_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS affiliate_products_active_idx
  ON public.affiliate_products (active) WHERE active;

ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read active products" ON public.affiliate_products;
CREATE POLICY "Members read active products"
  ON public.affiliate_products FOR SELECT TO authenticated
  USING (active);

-- Rows are written by the sync trigger below, never by hand — but staff need
-- to be able to correct one without a psql session.
DROP POLICY IF EXISTS "Staff manage products" ON public.affiliate_products;
CREATE POLICY "Staff manage products"
  ON public.affiliate_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

/**
 * Where a buyer is sent to buy this thing.
 *
 * Services own checkout, so a course-backed programme resolves through to the
 * service that actually sells the course. A course sold by nothing has no
 * checkout page; it gets its course URL, which at least lands somewhere real
 * rather than a 404 with an affiliate code on the end.
 */
CREATE OR REPLACE FUNCTION public.affiliate_checkout_path(_service_id uuid, _course_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $fn$
DECLARE
  svc record;
BEGIN
  IF _service_id IS NOT NULL THEN
    SELECT id, slug INTO svc FROM public.services WHERE id = _service_id;
    IF FOUND THEN
      RETURN '/checkout/' || COALESCE(NULLIF(btrim(svc.slug), ''), svc.id::text);
    END IF;
  END IF;

  IF _course_id IS NOT NULL THEN
    SELECT s.id, s.slug INTO svc
    FROM public.service_courses sc
    JOIN public.services s ON s.id = sc.service_id
    WHERE sc.course_id = _course_id
    ORDER BY sc.sort_order, s.created_at
    LIMIT 1;
    IF FOUND THEN
      RETURN '/checkout/' || COALESCE(NULLIF(btrim(svc.slug), ''), svc.id::text);
    END IF;
    RETURN '/courses/' || _course_id::text;
  END IF;

  RETURN '/courses';
END;
$fn$;

/**
 * Keeps affiliate_products in step with the programme it describes.
 *
 * Runs on every programme write and backfills once below, so an affiliate's
 * card shows the current title and the current rate without anybody
 * remembering to re-sync anything.
 */
CREATE OR REPLACE FUNCTION public.sync_affiliate_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  product_name text;
BEGIN
  SELECT COALESCE(
    (SELECT s.title FROM public.services s WHERE s.id = NEW.service_id),
    (SELECT c.title FROM public.courses  c WHERE c.id = NEW.course_id),
    'Membership'
  ) INTO product_name;

  INSERT INTO public.affiliate_products (
    program_id, service_id, course_id, name,
    commission_rate, checkout_base_url, active, updated_at
  )
  VALUES (
    NEW.id, NEW.service_id, NEW.course_id, product_name,
    COALESCE(NEW.commission_percent, 0),
    public.affiliate_checkout_path(NEW.service_id, NEW.course_id),
    COALESCE(NEW.is_active, true),
    now()
  )
  ON CONFLICT (program_id) DO UPDATE SET
    service_id        = EXCLUDED.service_id,
    course_id         = EXCLUDED.course_id,
    name              = EXCLUDED.name,
    commission_rate   = EXCLUDED.commission_rate,
    checkout_base_url = EXCLUDED.checkout_base_url,
    active            = EXCLUDED.active,
    updated_at        = now();

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_affiliate_program_sync ON public.affiliate_programs;
CREATE TRIGGER on_affiliate_program_sync
  AFTER INSERT OR UPDATE ON public.affiliate_programs
  FOR EACH ROW EXECUTE FUNCTION public.sync_affiliate_product();

-- Backfill: every programme that already exists gets its product row.
INSERT INTO public.affiliate_products (
  program_id, service_id, course_id, name, commission_rate, checkout_base_url, active
)
SELECT
  ap.id,
  ap.service_id,
  ap.course_id,
  COALESCE(s.title, c.title, 'Membership'),
  COALESCE(ap.commission_percent, 0),
  public.affiliate_checkout_path(ap.service_id, ap.course_id),
  COALESCE(ap.is_active, true)
FROM public.affiliate_programs ap
LEFT JOIN public.services s ON s.id = ap.service_id
LEFT JOIN public.courses  c ON c.id = ap.course_id
ON CONFLICT (program_id) DO NOTHING;

-- A retitled or re-slugged service must not leave stale cards behind.
CREATE OR REPLACE FUNCTION public.refresh_affiliate_product_from_service()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  UPDATE public.affiliate_products
     SET name              = NEW.title,
         checkout_base_url = public.affiliate_checkout_path(NEW.id, NULL),
         updated_at        = now()
   WHERE service_id = NEW.id;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_service_affiliate_refresh ON public.services;
CREATE TRIGGER on_service_affiliate_refresh
  AFTER UPDATE OF title, slug ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.refresh_affiliate_product_from_service();

-- ===========================================================================
-- 3. affiliate_links — one per member per product
-- ===========================================================================

ALTER TABLE public.affiliate_links
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  -- The member's stable code, the same one Refer & Earn shares. Not unique
  -- here on purpose: it repeats across every product the member promotes,
  -- which is what makes it *their* code rather than this link's code.
  ADD COLUMN IF NOT EXISTS affiliate_code text,
  -- Stored composed, so what the member copies and what the click handler
  -- parses can never drift apart. Relative, for the same reason as
  -- checkout_base_url.
  ADD COLUMN IF NOT EXISTS full_url text,
  -- A counter beside the affiliate_clicks log. The log is the audit trail; the
  -- counter is what four cards on a dashboard read without an aggregate.
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0;

-- The old shape required a programme. Product-based links do not have one.
ALTER TABLE public.affiliate_links ALTER COLUMN program_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_links_user_product_idx
  ON public.affiliate_links (user_id, product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS affiliate_links_code_idx
  ON public.affiliate_links (affiliate_code) WHERE affiliate_code IS NOT NULL;

-- Carry existing links onto their product, and give them the member's code.
--
-- One link per (member, product) from here on, but the old schema had no such
-- constraint and its "Generate Affiliate Link" button could be pressed twice.
-- Attaching every duplicate would violate the index above and fail the whole
-- migration, so the oldest link wins — it is the one already shared — and any
-- duplicate is left unattached rather than deleted.
UPDATE public.affiliate_links al
   SET product_id = keeper.product_id
  FROM (
    SELECT DISTINCT ON (l.user_id, ap.id)
           l.id AS link_id, ap.id AS product_id
    FROM public.affiliate_links l
    JOIN public.affiliate_products ap ON ap.program_id = l.program_id
    WHERE l.product_id IS NULL
    ORDER BY l.user_id, ap.id, l.created_at
  ) keeper
 WHERE keeper.link_id = al.id;

UPDATE public.affiliate_links al
   SET affiliate_code = rc.code
  FROM public.referral_codes rc
 WHERE rc.user_id = al.user_id
   AND al.affiliate_code IS NULL;

UPDATE public.affiliate_links al
   SET full_url = ap.checkout_base_url || '?affiliate=' || al.affiliate_code
  FROM public.affiliate_products ap
 WHERE ap.id = al.product_id
   AND al.affiliate_code IS NOT NULL
   AND al.full_url IS NULL;

-- Links are minted by affiliate_products_for_me() below, which runs as
-- definer. A member choosing their own code would be choosing an identity.
DROP POLICY IF EXISTS "Users can create links" ON public.affiliate_links;

-- ===========================================================================
-- 4. affiliate_clicks — the audit trail behind the counter
-- ===========================================================================

ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS product_id  uuid REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  -- The same browser-local random id the referral system uses, so a refresh is
  -- not a second click.
  ADD COLUMN IF NOT EXISTS visitor_key text;

ALTER TABLE public.affiliate_clicks ALTER COLUMN link_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS affiliate_clicks_link_time_idx
  ON public.affiliate_clicks (link_id, clicked_at DESC);

-- Anyone signed in could previously insert a click against any link at all.
-- Clicks now arrive only through record_affiliate_click().
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.affiliate_clicks;
DROP POLICY IF EXISTS "Authenticated can insert clicks" ON public.affiliate_clicks;

-- ===========================================================================
-- 5. affiliate_attributions — the thirty-day window, per product
-- ===========================================================================

-- A referral attaches to a signup, which is a single moment with a row of its
-- own. An affiliate sale usually has no signup: the buyer already has an
-- account, or creates one mid-checkout. So the claim has to be recorded
-- explicitly and has to expire, which is what this table is.
CREATE TABLE IF NOT EXISTS public.affiliate_attributions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The buyer.
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES public.affiliate_products(id) ON DELETE CASCADE,
  -- The affiliate who gets paid.
  affiliate_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_id      uuid REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  code         text NOT NULL,
  claimed_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,

  CONSTRAINT affiliate_attributions_not_self CHECK (user_id <> affiliate_id),
  -- Last touch wins within the window, which is the convention buyers and
  -- affiliates both expect: the link you actually clicked is the one that pays.
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS affiliate_attributions_lookup_idx
  ON public.affiliate_attributions (user_id, product_id, expires_at);

ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;

-- Written only by claim_affiliate_attribution(). An affiliate may see the
-- claims that pay them; a buyer has no reason to read who gets credit.
DROP POLICY IF EXISTS "Affiliates read their own attributions" ON public.affiliate_attributions;
CREATE POLICY "Affiliates read their own attributions"
  ON public.affiliate_attributions FOR SELECT TO authenticated
  USING (affiliate_id = auth.uid());

-- A paid purchase does not require an account: the buyer types their details,
-- pays, and the account is built out of those details afterwards. There is
-- therefore no session at checkout time for the browser to claim an
-- attribution with, and without this column every guest purchase through an
-- affiliate link would pay nobody. The code is carried on the order and the
-- commission trigger falls back to it.
ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS affiliate_code text;

-- ===========================================================================
-- 6. affiliate_sales — scoped to the affiliate, written only by the trigger
-- ===========================================================================

ALTER TABLE public.affiliate_sales
  -- The affiliate being paid. Denormalised so every read on this table is a
  -- single index scan on the one column RLS also filters by.
  ADD COLUMN IF NOT EXISTS user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id     uuid REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE public.affiliate_sales ALTER COLUMN link_id   DROP NOT NULL;
ALTER TABLE public.affiliate_sales ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.affiliate_sales ALTER COLUMN buyer_id  DROP NOT NULL;

-- A retried webhook delivers the same sale twice. One row per transaction.
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_sales_transaction_idx
  ON public.affiliate_sales (transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS affiliate_sales_user_time_idx
  ON public.affiliate_sales (user_id, purchased_at DESC);

UPDATE public.affiliate_sales s
   SET user_id = al.user_id
  FROM public.affiliate_links al
 WHERE al.id = s.link_id
   AND s.user_id IS NULL;

UPDATE public.affiliate_sales s
   SET product_id = al.product_id
  FROM public.affiliate_links al
 WHERE al.id = s.link_id
   AND s.product_id IS NULL;

-- The defect: any authenticated user could insert any commission row they
-- liked. Sales are now written exclusively by apply_affiliate_commission().
DROP POLICY IF EXISTS "System can insert sales" ON public.affiliate_sales;
DROP POLICY IF EXISTS "Authenticated can insert sales" ON public.affiliate_sales;

DROP POLICY IF EXISTS "Affiliates can view own sales" ON public.affiliate_sales;
CREATE POLICY "Affiliates can view own sales"
  ON public.affiliate_sales FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ===========================================================================
-- 7. affiliate_payouts — what has actually been settled
-- ===========================================================================

ALTER TABLE public.affiliate_payouts
  ADD COLUMN IF NOT EXISTS product_id        uuid REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  -- Captured at payout time rather than joined at read time: a payout
  -- statement must keep saying what it said, even if the product is renamed
  -- or deleted afterwards.
  ADD COLUMN IF NOT EXISTS membership_name   text,
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  -- The sales total the commission was calculated from, shown under the name.
  ADD COLUMN IF NOT EXISTS sales_amount      numeric NOT NULL DEFAULT 0;

UPDATE public.affiliate_payouts
   SET commission_amount = COALESCE(amount, 0)
 WHERE commission_amount = 0
   AND COALESCE(amount, 0) <> 0;

-- 'pending' meant "raised, not yet sent" and stays. 'not_paid' is the state
-- the dashboard shows in red; 'paid' is settled.
ALTER TABLE public.affiliate_payouts DROP CONSTRAINT IF EXISTS affiliate_payouts_status_check;
UPDATE public.affiliate_payouts
   SET status = 'not_paid'
 WHERE status NOT IN ('not_paid', 'paid', 'pending');
ALTER TABLE public.affiliate_payouts
  ADD CONSTRAINT affiliate_payouts_status_check
  CHECK (status IN ('not_paid', 'paid', 'pending'));

CREATE INDEX IF NOT EXISTS affiliate_payouts_user_time_idx
  ON public.affiliate_payouts (user_id, created_at DESC);

-- ===========================================================================
-- 8. affiliate_bank_details — encrypted, and write-only from the browser
-- ===========================================================================

ALTER TABLE public.affiliate_bank_details
  ADD COLUMN IF NOT EXISTS account_number_enc bytea,
  ADD COLUMN IF NOT EXISTS ifsc_code_enc      bytea,
  -- The only part of the account number that ever comes back out. Enough for
  -- a member to recognise which account they entered, useless to anyone else.
  ADD COLUMN IF NOT EXISTS account_last4      text,
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();

-- Migrate whatever is already stored in plaintext, then remove the plaintext.
UPDATE public.affiliate_bank_details
   SET account_number_enc = CASE
         WHEN account_number IS NOT NULL AND btrim(account_number) <> ''
         THEN pgp_sym_encrypt(btrim(account_number), secure.bank_key())
       END,
       ifsc_code_enc = CASE
         WHEN ifsc_code IS NOT NULL AND btrim(ifsc_code) <> ''
         THEN pgp_sym_encrypt(upper(btrim(ifsc_code)), secure.bank_key())
       END,
       account_last4 = right(regexp_replace(COALESCE(account_number, ''), '\D', '', 'g'), 4)
 WHERE account_number_enc IS NULL;

ALTER TABLE public.affiliate_bank_details DROP COLUMN IF EXISTS account_number;
ALTER TABLE public.affiliate_bank_details DROP COLUMN IF EXISTS ifsc_code;

-- Lets the UI ask "are details on file?" without reading any of them.
ALTER TABLE public.affiliate_bank_details
  ADD COLUMN IF NOT EXISTS has_details boolean
  GENERATED ALWAYS AS (account_number_enc IS NOT NULL) STORED;

-- The ciphertext is never selectable by a client role, encrypted or not.
-- Reads go through my_affiliate_bank_details(), writes through
-- save_affiliate_bank_details(); both run as definer.
REVOKE ALL ON public.affiliate_bank_details FROM anon, authenticated;

DROP POLICY IF EXISTS "Users manage own bank details" ON public.affiliate_bank_details;
DROP POLICY IF EXISTS "Users read own bank details" ON public.affiliate_bank_details;
CREATE POLICY "Users read own bank details"
  ON public.affiliate_bank_details FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ===========================================================================
-- 9. Recording a click
-- ===========================================================================

/**
 * The shared attribution window, in days.
 *
 * One number for both programmes. An affiliate reading "a click counts for 30
 * days" on Refer & Earn and getting 7 here would be a bug you could only find
 * by losing a commission.
 */
CREATE OR REPLACE FUNCTION public.affiliate_attribution_days()
RETURNS int
LANGUAGE sql
STABLE
SET search_path = public
AS $fn$
  SELECT COALESCE((SELECT attribution_days FROM public.referral_program WHERE id), 30);
$fn$;

/**
 * POST /api/affiliate/click/:code — one click on one product's link.
 *
 * Callable anonymously, because that is who clicks an affiliate link. It takes
 * a code and a checkout path rather than a link id, resolves both itself, and
 * returns false rather than raising when either is unknown — a visitor who
 * arrives with a mangled code still gets the page they asked for.
 *
 * Deduplicated per browser per window: a refresh, a back button, or reading
 * the sales page twice is one click. The same person genuinely returning after
 * the window has closed is a new one.
 */
CREATE OR REPLACE FUNCTION public.record_affiliate_click(
  _code text,
  _checkout_path text,
  _visitor_key text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_code    text := upper(btrim(COALESCE(_code, '')));
  v_key     text := left(nullif(btrim(COALESCE(_visitor_key, '')), ''), 64);
  v_path    text := split_part(btrim(COALESCE(_checkout_path, '')), '?', 1);
  v_owner   uuid;
  v_product uuid;
  v_link    uuid;
  v_days    int := public.affiliate_attribution_days();
BEGIN
  IF v_code = '' OR v_path = '' THEN
    RETURN false;
  END IF;

  SELECT rc.user_id INTO v_owner FROM public.referral_codes rc WHERE rc.code = v_code;
  IF v_owner IS NULL THEN
    RETURN false;
  END IF;

  -- Same deterministic pick as claim_affiliate_attribution(), so the click and
  -- the claim can never land on different products for one path.
  SELECT p.id INTO v_product
  FROM public.affiliate_products p
  WHERE p.active AND p.checkout_base_url = v_path
  ORDER BY p.commission_rate DESC, p.created_at
  LIMIT 1;
  IF v_product IS NULL THEN
    RETURN false;
  END IF;

  SELECT al.id INTO v_link
  FROM public.affiliate_links al
  WHERE al.user_id = v_owner AND al.product_id = v_product;
  IF v_link IS NULL THEN
    RETURN false;
  END IF;

  -- A click with no visitor key cannot be deduplicated, so it always counts;
  -- that is the honest reading of "a browser that will not hold an id".
  IF v_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.affiliate_clicks c
    WHERE c.link_id = v_link
      AND c.visitor_key = v_key
      AND c.clicked_at > now() - make_interval(days => v_days)
  ) THEN
    RETURN true;
  END IF;

  INSERT INTO public.affiliate_clicks (link_id, product_id, visitor_key)
  VALUES (v_link, v_product, v_key);

  UPDATE public.affiliate_links SET clicks = clicks + 1 WHERE id = v_link;

  RETURN true;
END;
$fn$;

REVOKE ALL ON FUNCTION public.record_affiliate_click(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_affiliate_click(text, text, text) TO anon, authenticated;

/**
 * Binds a click to the person who will do the buying.
 *
 * Called once the visitor is signed in — at checkout, or on the next page load
 * after they log in. Until this runs the click is anonymous and pays nobody;
 * after it, any purchase of that product within the window is credited.
 *
 * Re-claiming refreshes the expiry, so a buyer who clicks the same affiliate's
 * link again on day 29 does not lose the attribution on day 31.
 */
CREATE OR REPLACE FUNCTION public.claim_affiliate_attribution(_code text, _checkout_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_code    text := upper(btrim(COALESCE(_code, '')));
  v_path    text := split_part(btrim(COALESCE(_checkout_path, '')), '?', 1);
  v_owner   uuid;
  v_product uuid;
  v_link    uuid;
BEGIN
  IF auth.uid() IS NULL OR v_code = '' OR v_path = '' THEN
    RETURN false;
  END IF;

  SELECT rc.user_id INTO v_owner FROM public.referral_codes rc WHERE rc.code = v_code;
  -- Self-referral is not a sale you get paid for.
  IF v_owner IS NULL OR v_owner = auth.uid() THEN
    RETURN false;
  END IF;

  -- Two programmes can point at the same service, which gives two products the
  -- same checkout path. Ordering makes the pick deterministic rather than
  -- whatever the planner returned first, and picks the better rate, so an
  -- affiliate is never quietly paid the lower of two published numbers.
  SELECT p.id INTO v_product
  FROM public.affiliate_products p
  WHERE p.active AND p.checkout_base_url = v_path
  ORDER BY p.commission_rate DESC, p.created_at
  LIMIT 1;
  IF v_product IS NULL THEN
    RETURN false;
  END IF;

  SELECT al.id INTO v_link
  FROM public.affiliate_links al
  WHERE al.user_id = v_owner AND al.product_id = v_product;

  INSERT INTO public.affiliate_attributions (
    user_id, product_id, affiliate_id, link_id, code, expires_at
  )
  VALUES (
    auth.uid(), v_product, v_owner, v_link, v_code,
    now() + make_interval(days => public.affiliate_attribution_days())
  )
  ON CONFLICT (user_id, product_id) DO UPDATE SET
    affiliate_id = EXCLUDED.affiliate_id,
    link_id      = EXCLUDED.link_id,
    code         = EXCLUDED.code,
    claimed_at   = now(),
    expires_at   = EXCLUDED.expires_at;

  RETURN true;
END;
$fn$;

REVOKE ALL ON FUNCTION public.claim_affiliate_attribution(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_affiliate_attribution(text, text) TO authenticated;

-- ===========================================================================
-- 10. Turning a sale into a commission
-- ===========================================================================

/**
 * Books the affiliate's cut of a completed sale, and unbooks it on a refund.
 *
 * Sits alongside apply_referral_reward() on the same table rather than inside
 * it: the two programmes pay different people for different reasons, and one
 * purchase can legitimately trigger both — the friend who invited you and the
 * affiliate whose link you bought through are not usually the same person.
 *
 * The commission is amount * rate, and only when the rate is above zero; a
 * product configured at 0% produces no row at all rather than a row of zeroes
 * cluttering somebody's sales table.
 */
CREATE OR REPLACE FUNCTION public.apply_affiliate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  product    record;
  order_row  record;
  link       record;
  affiliate  uuid;
  commission numeric;
  phone      text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.service_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only a status that actually moved counts; without this any
  -- later edit to a completed sale would pay the affiliate a second time.
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- A refund takes back the row the sale created. The unique index on
  -- transaction_id is per transaction and a refund is its own transaction, so
  -- the sale is found by its product and buyer instead — and exactly one row
  -- goes, the most recent. A buyer who bought the same membership twice and
  -- refunded once must not have both commissions reversed.
  IF NEW.type = 'refund' AND NEW.status = 'refunded' THEN
    DELETE FROM public.affiliate_sales
    WHERE id = (
      SELECT s.id
      FROM public.affiliate_sales s
      JOIN public.affiliate_products p ON p.id = s.product_id
      WHERE p.service_id = NEW.service_id
        AND s.buyer_id = NEW.user_id
      ORDER BY s.purchased_at DESC
      LIMIT 1
    );
    RETURN NEW;
  END IF;

  IF NEW.type <> 'sale' OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT p.* INTO product
  FROM public.affiliate_products p
  WHERE p.service_id = NEW.service_id AND p.active
  ORDER BY p.commission_rate DESC, p.created_at
  LIMIT 1;
  IF product.id IS NULL OR COALESCE(product.commission_rate, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- The order behind this sale, if there is one. It carries both the buyer's
  -- phone number — the only place one is captured — and the affiliate code for
  -- a guest purchase.
  SELECT po.buyer_phone, po.affiliate_code INTO order_row
  FROM public.payment_orders po
  WHERE po.service_id = NEW.service_id
    AND (po.user_id = NEW.user_id OR po.buyer_email = lower(btrim(NEW.customer_email)))
  ORDER BY po.created_at DESC
  LIMIT 1;

  phone := order_row.buyer_phone;

  SELECT a.affiliate_id INTO affiliate
  FROM public.affiliate_attributions a
  WHERE a.user_id = NEW.user_id
    AND a.product_id = product.id
    AND a.expires_at > now();

  -- Fallback for a purchase made with no account: the claim could not be
  -- recorded because there was no session, so the code on the order is the
  -- only record of who sent this buyer.
  IF affiliate IS NULL AND order_row.affiliate_code IS NOT NULL THEN
    SELECT rc.user_id INTO affiliate
    FROM public.referral_codes rc
    WHERE rc.code = upper(btrim(order_row.affiliate_code));
  END IF;

  -- Nobody to pay, or the only candidate is the buyer themselves.
  IF affiliate IS NULL OR affiliate = NEW.user_id THEN
    RETURN NEW;
  END IF;

  commission := COALESCE(NEW.amount, 0) * product.commission_rate / 100;

  SELECT * INTO link
  FROM public.affiliate_links
  WHERE user_id = affiliate AND product_id = product.id;

  INSERT INTO public.affiliate_sales (
    user_id, product_id, link_id, transaction_id, buyer_id,
    buyer_name, buyer_email, buyer_phone, course_id,
    coupon_code, amount_paid, commission_earned, purchased_at
  )
  VALUES (
    affiliate,
    product.id,
    link.id,
    NEW.id,
    NEW.user_id,
    COALESCE(NEW.customer_name, (SELECT full_name FROM public.profiles WHERE id = NEW.user_id)),
    COALESCE(NEW.customer_email, (SELECT email FROM public.profiles WHERE id = NEW.user_id)),
    phone,
    product.course_id,
    NEW.metadata ->> 'coupon_code',
    COALESCE(NEW.amount, 0),
    commission,
    NEW.occurred_at
  )
  ON CONFLICT (transaction_id) DO NOTHING;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_transaction_affiliate_commission ON public.transactions;
CREATE TRIGGER on_transaction_affiliate_commission
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_affiliate_commission();

-- ===========================================================================
-- 11. The endpoints
-- ===========================================================================

-- Each of these returns jsonb shaped like the REST response it stands in for,
-- and each takes no user id: the caller is auth.uid() and nothing else, so
-- there is no argument to tamper with to read somebody else's earnings.

/**
 * GET /api/affiliate/products
 *
 * Every active product, the caller's link for it — minted here on first read,
 * so an affiliate never has to press "generate" before they can share — and
 * the four numbers on the card.
 */
CREATE OR REPLACE FUNCTION public.affiliate_products_for_me()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me   uuid := auth.uid();
  code text;
  result jsonb;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to view affiliate products';
  END IF;

  -- Same code as Refer & Earn, minted on first use by the same function.
  code := public.my_referral_code();

  -- One link per active product, created on demand. referral_code carries the
  -- table's original uniqueness requirement; affiliate_code is the shareable
  -- identity and repeats across products by design.
  INSERT INTO public.affiliate_links (user_id, product_id, program_id, referral_code, affiliate_code, full_url)
  SELECT me, p.id, p.program_id,
         code || '-' || left(replace(p.id::text, '-', ''), 8),
         code,
         p.checkout_base_url || '?affiliate=' || code
  FROM public.affiliate_products p
  WHERE p.active
  ON CONFLICT (user_id, product_id) WHERE product_id IS NOT NULL DO NOTHING;

  -- A link inherited from the original build may predate the member having a
  -- code at all, and a product whose checkout path moved (renamed service, new
  -- slug) must not keep handing out a dead URL. Both are repaired on read.
  UPDATE public.affiliate_links al
     SET affiliate_code = code
   WHERE al.user_id = me
     AND al.affiliate_code IS DISTINCT FROM code;

  UPDATE public.affiliate_links al
     SET full_url = p.checkout_base_url || '?affiliate=' || al.affiliate_code
    FROM public.affiliate_products p
   WHERE p.id = al.product_id
     AND al.user_id = me
     AND al.affiliate_code IS NOT NULL
     AND al.full_url IS DISTINCT FROM p.checkout_base_url || '?affiliate=' || al.affiliate_code;

  SELECT jsonb_build_object(
    'affiliate_code', code,
    'products', COALESCE(jsonb_agg(card.item ORDER BY card.sort_name), '[]'::jsonb)
  )
  INTO result
  FROM (
    SELECT p.name AS sort_name,
           jsonb_build_object(
             'id',                p.id,
             'name',              p.name,
             'commission_rate',   p.commission_rate,
             'commission_basis',  p.commission_basis,
             'checkout_base_url', p.checkout_base_url,
             'affiliate_code',    al.affiliate_code,
             'full_url',          al.full_url,
             'clicks',            COALESCE(al.clicks, 0),
             'sales_count',       COALESCE(agg.sales_count, 0),
             'sales_amount',      COALESCE(agg.sales_amount, 0),
             'commission_amount', COALESCE(agg.commission_amount, 0)
           ) AS item
    FROM public.affiliate_products p
    LEFT JOIN public.affiliate_links al
           ON al.product_id = p.id AND al.user_id = me
    LEFT JOIN LATERAL (
      SELECT count(*)                              AS sales_count,
             COALESCE(sum(s.amount_paid), 0)       AS sales_amount,
             COALESCE(sum(s.commission_earned), 0) AS commission_amount
      FROM public.affiliate_sales s
      WHERE s.user_id = me AND s.product_id = p.id
    ) agg ON true
    WHERE p.active
  ) card;

  RETURN result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.affiliate_products_for_me() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.affiliate_products_for_me() TO authenticated;

/**
 * GET /api/affiliate/sales?search=&membership=&start=&end=
 *
 * The page of rows the table shows, plus the three totals above it. The totals
 * are computed over the whole filtered set rather than the page, because "Total
 * Amount of Sales" that changes when you press Next is not a total.
 */
CREATE OR REPLACE FUNCTION public.affiliate_sales_for_me(
  _search     text DEFAULT NULL,
  _product_id uuid DEFAULT NULL,
  _start      date DEFAULT NULL,
  _end        date DEFAULT NULL,
  _limit      int  DEFAULT 25,
  _offset     int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me     uuid := auth.uid();
  term   text := nullif(btrim(COALESCE(_search, '')), '');
  -- Clamped: the page sends 25, but the argument is caller-supplied and an
  -- unbounded limit is a way to make the database do unbounded work.
  lim    int  := least(greatest(COALESCE(_limit, 25), 1), 200);
  off    int  := greatest(COALESCE(_offset, 0), 0);
  result jsonb;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to view affiliate sales';
  END IF;

  WITH filtered AS (
    SELECT s.id, s.buyer_name, s.buyer_phone, s.buyer_email,
           s.coupon_code, s.amount_paid, s.commission_earned, s.purchased_at,
           s.product_id, COALESCE(p.name, 'Membership') AS membership_name
    FROM public.affiliate_sales s
    LEFT JOIN public.affiliate_products p ON p.id = s.product_id
    WHERE s.user_id = me
      AND (_product_id IS NULL OR s.product_id = _product_id)
      AND (_start IS NULL OR s.purchased_at >= _start::timestamptz)
      -- Inclusive of the end date: a picker showing "to 30 Sep" must include
      -- the 30th, not stop at its first second.
      AND (_end IS NULL OR s.purchased_at < (_end + 1)::timestamptz)
      AND (
        term IS NULL
        OR s.buyer_name  ILIKE '%' || term || '%'
        OR s.buyer_email ILIKE '%' || term || '%'
        OR s.buyer_phone ILIKE '%' || term || '%'
      )
  )
  SELECT jsonb_build_object(
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                f.id,
        'buyer_name',        f.buyer_name,
        'buyer_phone',       f.buyer_phone,
        'buyer_email',       f.buyer_email,
        'membership_name',   f.membership_name,
        'product_id',        f.product_id,
        'coupon_code',       f.coupon_code,
        'amount_paid',       f.amount_paid,
        'commission_earned', f.commission_earned,
        'purchased_at',      f.purchased_at
      ) ORDER BY f.purchased_at DESC)
      FROM (SELECT * FROM filtered ORDER BY purchased_at DESC LIMIT lim OFFSET off) f
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'count',      (SELECT count(*) FROM filtered),
      'amount',     (SELECT COALESCE(sum(amount_paid), 0) FROM filtered),
      'commission', (SELECT COALESCE(sum(commission_earned), 0) FROM filtered)
    ),
    'limit',  lim,
    'offset', off
  )
  INTO result;

  RETURN result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.affiliate_sales_for_me(text, uuid, date, date, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.affiliate_sales_for_me(text, uuid, date, date, int, int) TO authenticated;

/**
 * GET /api/affiliate/payments
 *
 * The payout ledger, plus paid and due.
 *
 * Due is everything earned minus everything already paid out, not the sum of
 * the unpaid payout rows: commission is earned the moment a sale lands, and an
 * affiliate should see it owed to them before anybody has raised a payout for
 * it. Floored at zero so an over-payment reads as nothing owed rather than as
 * a negative debt.
 */
CREATE OR REPLACE FUNCTION public.affiliate_payments_for_me()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me     uuid := auth.uid();
  earned numeric;
  paid   numeric;
  result jsonb;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to view affiliate payments';
  END IF;

  SELECT COALESCE(sum(commission_earned), 0) INTO earned
  FROM public.affiliate_sales WHERE user_id = me;

  SELECT COALESCE(sum(commission_amount), 0) INTO paid
  FROM public.affiliate_payouts WHERE user_id = me AND status = 'paid';

  SELECT jsonb_build_object(
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                po.id,
        'created_at',        po.created_at,
        'membership_name',   COALESCE(po.membership_name, p.name, 'Commission payout'),
        'sales_amount',      po.sales_amount,
        'commission_amount', po.commission_amount,
        'status',            po.status,
        'remark',            po.remark
      ) ORDER BY po.created_at DESC)
      FROM public.affiliate_payouts po
      LEFT JOIN public.affiliate_products p ON p.id = po.product_id
      WHERE po.user_id = me
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'paid', paid,
      'due',  greatest(earned - paid, 0)
    )
  )
  INTO result;

  RETURN result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.affiliate_payments_for_me() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.affiliate_payments_for_me() TO authenticated;

-- ===========================================================================
-- 12. Bank details
-- ===========================================================================

/**
 * GET /api/affiliate/bank-details
 *
 * What the member is allowed to see about what they stored: the holder, the
 * bank, and the last four digits. The account number and IFSC do not come back
 * — not to the member, not to staff, not to anything holding a browser token.
 * Correcting a typo means retyping the number, which is the right trade for a
 * field that is only ever written once.
 */
CREATE OR REPLACE FUNCTION public.my_affiliate_bank_details()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  row_found record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to view bank details';
  END IF;

  SELECT account_holder, bank_name, account_last4, has_details, updated_at
    INTO row_found
  FROM public.affiliate_bank_details
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_details', false);
  END IF;

  RETURN jsonb_build_object(
    'has_details',    COALESCE(row_found.has_details, false),
    'account_holder', row_found.account_holder,
    'bank_name',      row_found.bank_name,
    'account_last4',  row_found.account_last4,
    'updated_at',     row_found.updated_at
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.my_affiliate_bank_details() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_affiliate_bank_details() TO authenticated;

/**
 * PUT /api/affiliate/bank-details
 *
 * Encrypts on the way in and returns only the masked summary, so the number
 * exists in plaintext for the length of one statement and nowhere else. The
 * arguments are never logged: this function raises with fixed messages and
 * interpolates no input into any of them.
 *
 * Validation is deliberately loose on the account number — Indian account
 * numbers run 9 to 18 digits across banks — and strict on IFSC, which has one
 * shape: four letters, a zero, six alphanumerics.
 */
CREATE OR REPLACE FUNCTION public.save_affiliate_bank_details(
  _account_holder text,
  _bank_name      text,
  _account_number text,
  _ifsc_code      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  me      uuid := auth.uid();
  holder  text := btrim(COALESCE(_account_holder, ''));
  bank    text := btrim(COALESCE(_bank_name, ''));
  acct    text := regexp_replace(COALESCE(_account_number, ''), '\s', '', 'g');
  ifsc    text := upper(regexp_replace(COALESCE(_ifsc_code, ''), '\s', '', 'g'));
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to save bank details';
  END IF;

  IF holder = '' OR bank = '' THEN
    RAISE EXCEPTION 'Account holder and bank name are both required';
  END IF;

  IF acct !~ '^[0-9]{9,18}$' THEN
    RAISE EXCEPTION 'Account number must be 9 to 18 digits';
  END IF;

  IF ifsc !~ '^[A-Z]{4}0[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'IFSC code must look like HDFC0001234';
  END IF;

  INSERT INTO public.affiliate_bank_details (
    user_id, account_holder, bank_name,
    account_number_enc, ifsc_code_enc, account_last4, updated_at
  )
  VALUES (
    me, left(holder, 120), left(bank, 120),
    pgp_sym_encrypt(acct, secure.bank_key()),
    pgp_sym_encrypt(ifsc, secure.bank_key()),
    right(acct, 4),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    account_holder     = EXCLUDED.account_holder,
    bank_name          = EXCLUDED.bank_name,
    account_number_enc = EXCLUDED.account_number_enc,
    ifsc_code_enc      = EXCLUDED.ifsc_code_enc,
    account_last4      = EXCLUDED.account_last4,
    updated_at         = now();

  RETURN public.my_affiliate_bank_details();
END;
$fn$;

REVOKE ALL ON FUNCTION public.save_affiliate_bank_details(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_affiliate_bank_details(text, text, text, text) TO authenticated;

/**
 * The one way plaintext bank details come back out, for the process that
 * actually pays people.
 *
 * Not granted to anon or authenticated: only the service role, which bypasses
 * RLS anyway, can execute it. It exists so that a payout run has a documented,
 * greppable door rather than an ad-hoc decrypt somewhere in an edge function.
 */
CREATE OR REPLACE FUNCTION public.affiliate_payout_details(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  r record;
BEGIN
  SELECT account_holder, bank_name, account_number_enc, ifsc_code_enc INTO r
  FROM public.affiliate_bank_details WHERE user_id = _user_id;

  IF NOT FOUND OR r.account_number_enc IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'account_holder', r.account_holder,
    'bank_name',      r.bank_name,
    'account_number', pgp_sym_decrypt(r.account_number_enc, secure.bank_key()),
    'ifsc_code',      pgp_sym_decrypt(r.ifsc_code_enc, secure.bank_key())
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.affiliate_payout_details(uuid) FROM PUBLIC;

-- ===========================================================================
-- 13. Realtime
-- ===========================================================================

-- So a sale appears on the dashboard as it lands. RLS still decides what a
-- subscriber receives, so an affiliate is only ever woken by their own rows.
DO $blk$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_sales;
EXCEPTION WHEN duplicate_object THEN NULL;
END $blk$;

DO $blk$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_payouts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $blk$;

ALTER TABLE public.affiliate_sales   REPLICA IDENTITY FULL;
ALTER TABLE public.affiliate_payouts REPLICA IDENTITY FULL;
