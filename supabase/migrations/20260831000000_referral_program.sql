-- Refer & Earn, with the data behind it.
--
-- /referral shipped as a mock: three invented names, a hardcoded "$180", and
-- a link reading "https://platform.com/ref/your-code" that went nowhere. None
-- of it was wired to anything, so a member who shared it referred no one and
-- earned nothing.
--
-- What a referral programme actually needs is a chain that survives the gap
-- between a stranger clicking a link and a purchase days later:
--
--   code  ->  visit (anonymous)  ->  signup (attributed)  ->  purchase (paid)
--
-- Each step here has a row, and each row belongs to exactly one referrer.
-- Reading someone else's numbers is not possible; the totals a member sees
-- come from SECURITY DEFINER functions that filter on auth.uid() and never
-- take a user id as an argument.

-- ------------------------------------------------------------ the codes --

CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referral_codes IS
  'One shareable code per member. Codes are stable: a link already sent out keeps working.';

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- A member reads their own code. Nobody reads anybody else's: the code is the
-- credential that attributes a signup, so a readable list of them would let
-- one member claim another's referrals.
DROP POLICY IF EXISTS "Members read their own referral code" ON public.referral_codes;
CREATE POLICY "Members read their own referral code"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

/**
 * Six characters from an alphabet with no 0/O/1/I/L, because these get read
 * aloud and typed by hand off a phone screen.
 */
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- Only ever called from my_referral_code() below, which runs as definer.
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM public;

/**
 * The caller's code, minted on first use.
 *
 * SECURITY DEFINER so the insert does not need an INSERT policy that a member
 * could use to choose their own code — a code is assigned, never claimed.
 */
CREATE OR REPLACE FUNCTION public.my_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to get a referral code';
  END IF;

  SELECT code INTO existing FROM public.referral_codes WHERE user_id = auth.uid();
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.referral_codes (user_id, code)
  VALUES (auth.uid(), public.generate_referral_code())
  -- Two tabs opening the page at once must not raise; the first one wins.
  ON CONFLICT (user_id) DO NOTHING;

  SELECT code INTO existing FROM public.referral_codes WHERE user_id = auth.uid();
  RETURN existing;
END;
$$;

REVOKE ALL ON FUNCTION public.my_referral_code() FROM public;
GRANT EXECUTE ON FUNCTION public.my_referral_code() TO authenticated;

-- ------------------------------------------------------------- the terms --

-- What a referrer earns. One row, edited by admins, read by everyone — the
-- offer has to be visible to the person being asked to share.
CREATE TABLE IF NOT EXISTS public.referral_program (
  id                  boolean PRIMARY KEY DEFAULT true CHECK (id),
  is_active           boolean NOT NULL DEFAULT true,
  -- Paid once, when a referred person signs up.
  signup_reward       numeric NOT NULL DEFAULT 0 CHECK (signup_reward >= 0),
  -- Share of everything a referred person spends, for as long as they spend it.
  purchase_percent    numeric NOT NULL DEFAULT 10 CHECK (purchase_percent >= 0 AND purchase_percent <= 100),
  currency            text NOT NULL DEFAULT 'INR',
  -- How long a click stays attributable if the person does not sign up at once.
  attribution_days    int NOT NULL DEFAULT 30 CHECK (attribution_days > 0),
  terms               text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.referral_program (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.referral_program ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone reads the referral terms" ON public.referral_program;
CREATE POLICY "Everyone reads the referral terms"
  ON public.referral_program FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins set the referral terms" ON public.referral_program;
CREATE POLICY "Admins set the referral terms"
  ON public.referral_program FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ------------------------------------------------------------- the clicks --

CREATE TABLE IF NOT EXISTS public.referral_visits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code         text NOT NULL,
  -- A random id the visitor's browser keeps, so a refresh is not a new click
  -- and a signup can be tied back to the click that brought them.
  visitor_key  text,
  landed_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referral_visits IS
  'One row per landing on a referral link, including visitors who never sign up.';

CREATE INDEX IF NOT EXISTS referral_visits_referrer_idx
  ON public.referral_visits (referrer_id, landed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS referral_visits_once_per_visitor_idx
  ON public.referral_visits (referrer_id, visitor_key)
  WHERE visitor_key IS NOT NULL;

ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;

-- Only the referrer sees their own clicks. There is deliberately no INSERT
-- policy: visits arrive through record_referral_visit() below, so an open
-- endpoint cannot be used to inflate somebody's numbers with arbitrary rows.
DROP POLICY IF EXISTS "Referrers read their own visits" ON public.referral_visits;
CREATE POLICY "Referrers read their own visits"
  ON public.referral_visits FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

/**
 * Records a click on a referral link.
 *
 * Callable by anonymous visitors, because that is who clicks a referral link —
 * but it takes a code rather than a user id, resolves it itself, and does
 * nothing at all if the code is not real. The unique index makes a repeat
 * visit from the same browser a no-op rather than a second click.
 *
 * @returns true when the code resolved, so the landing page knows whether to
 *          carry it forward to signup.
 */
CREATE OR REPLACE FUNCTION public.record_referral_visit(_code text, _visitor_key text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  active boolean;
BEGIN
  SELECT is_active INTO active FROM public.referral_program WHERE id;
  IF NOT COALESCE(active, false) THEN
    RETURN false;
  END IF;

  SELECT user_id INTO owner_id
  FROM public.referral_codes
  WHERE code = upper(btrim(_code));

  IF owner_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.referral_visits (referrer_id, code, visitor_key)
  VALUES (
    owner_id,
    upper(btrim(_code)),
    -- Capped: the key comes from the browser, and this is the one field on
    -- the row that a caller controls the contents of.
    left(nullif(btrim(coalesce(_visitor_key, '')), ''), 64)
  )
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_referral_visit(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_referral_visit(text, text) TO anon, authenticated;

-- ---------------------------------------------------------- the referrals --

CREATE TABLE IF NOT EXISTS public.referrals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- One row per referred person: whoever's link they arrived on keeps them.
  referred_user_id  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code              text NOT NULL,
  signed_up_at      timestamptz NOT NULL DEFAULT now(),
  first_purchase_at timestamptz,
  purchase_count    int NOT NULL DEFAULT 0,
  -- Gross spend by the referred person, and the referrer's cut of it.
  revenue           numeric NOT NULL DEFAULT 0,
  reward_amount     numeric NOT NULL DEFAULT 0,
  reward_status     text NOT NULL DEFAULT 'pending'
                      CHECK (reward_status IN ('pending', 'approved', 'paid')),
  CONSTRAINT referrals_not_self CHECK (referrer_id <> referred_user_id)
);

COMMENT ON TABLE public.referrals IS
  'A signup attributed to a referrer, with everything that person has since spent.';

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON public.referrals (referrer_id, signed_up_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- A referrer sees who they brought in. Nobody writes this table by hand: rows
-- are created by the signup trigger and updated by the purchase trigger.
DROP POLICY IF EXISTS "Referrers read their own referrals" ON public.referrals;
CREATE POLICY "Referrers read their own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

DROP POLICY IF EXISTS "Staff read every referral" ON public.referrals;
CREATE POLICY "Staff read every referral"
  ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Staff settle rewards" ON public.referrals;
CREATE POLICY "Staff settle rewards"
  ON public.referrals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- --------------------------------------------------- attributing a signup --

/**
 * Creates the profile and role rows for a new account, and — new here —
 * attributes the signup to whoever referred them.
 *
 * The referral half is wrapped so that a bad code can never stop an account
 * being created. Somebody typing a nonsense ?ref= should still get in.
 */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_code text;
  owner_id uuid;
  reward numeric;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');

  BEGIN
    raw_code := upper(btrim(COALESCE(NEW.raw_user_meta_data ->> 'referral_code', '')));
    IF raw_code <> '' THEN
      SELECT user_id INTO owner_id FROM public.referral_codes WHERE code = raw_code;

      IF owner_id IS NOT NULL AND owner_id <> NEW.id THEN
        SELECT CASE WHEN is_active THEN signup_reward ELSE 0 END
          INTO reward
          FROM public.referral_program WHERE id;

        INSERT INTO public.referrals (referrer_id, referred_user_id, code, reward_amount)
        VALUES (owner_id, NEW.id, raw_code, COALESCE(reward, 0))
        ON CONFLICT (referred_user_id) DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Attribution is worth losing; the account is not.
    RAISE WARNING 'referral attribution failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------- attributing a purchase --

/**
 * Rolls a completed sale (or a refund) into the referrer's totals.
 *
 * Runs on transactions, which is where both payment providers land a
 * confirmed purchase. A refund subtracts what the sale added, so a referrer
 * is not paid for revenue that went back — and the count never goes negative
 * just because a refund arrived for a sale predating the programme.
 */
CREATE OR REPLACE FUNCTION public.apply_referral_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  percent numeric;
  active boolean;
  direction int;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only a status that actually moved counts. Without this, any
  -- later edit to a completed sale would credit the referrer a second time.
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.type = 'sale' AND NEW.status = 'completed' THEN
    direction := 1;
  ELSIF NEW.type = 'refund' AND NEW.status = 'refunded' THEN
    direction := -1;
  ELSE
    RETURN NEW;
  END IF;

  SELECT is_active, purchase_percent INTO active, percent
    FROM public.referral_program WHERE id;
  IF NOT COALESCE(active, false) THEN
    RETURN NEW;
  END IF;

  UPDATE public.referrals SET
    purchase_count    = GREATEST(0, purchase_count + direction),
    revenue           = GREATEST(0, revenue + direction * COALESCE(NEW.amount, 0)),
    reward_amount     = GREATEST(
                          0,
                          reward_amount + direction * COALESCE(NEW.amount, 0) * COALESCE(percent, 0) / 100
                        ),
    first_purchase_at = COALESCE(first_purchase_at, CASE WHEN direction = 1 THEN NEW.occurred_at END)
  WHERE referred_user_id = NEW.user_id
    -- A reward already paid out is history; a later refund does not rewrite it.
    AND reward_status <> 'paid';

  RETURN NEW;
END;
$$;

-- Both providers insert a sale already marked completed, so INSERT is the
-- path that fires in practice. UPDATE OF status is here for a gateway that
-- lands a row as pending and confirms it afterwards; the guard inside the
-- function is what keeps those two from crediting the same sale twice.
DROP TRIGGER IF EXISTS on_transaction_referral_reward ON public.transactions;
CREATE TRIGGER on_transaction_referral_reward
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_referral_reward();

-- ------------------------------------------------------------ the numbers --

/**
 * The caller's own funnel, in one row.
 *
 * Takes no arguments on purpose: there is no user id to tamper with, so this
 * cannot be used to read anyone else's performance.
 */
CREATE OR REPLACE FUNCTION public.my_referral_stats()
RETURNS TABLE (
  visits          bigint,
  signups         bigint,
  buyers          bigint,
  revenue         numeric,
  reward_pending  numeric,
  reward_approved numeric,
  reward_paid     numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    (SELECT count(*) FROM public.referral_visits v WHERE v.referrer_id = auth.uid()),
    (SELECT count(*) FROM public.referrals r WHERE r.referrer_id = auth.uid()),
    (SELECT count(*) FROM public.referrals r WHERE r.referrer_id = auth.uid() AND r.purchase_count > 0),
    (SELECT COALESCE(sum(r.revenue), 0) FROM public.referrals r WHERE r.referrer_id = auth.uid()),
    (SELECT COALESCE(sum(r.reward_amount), 0) FROM public.referrals r
       WHERE r.referrer_id = auth.uid() AND r.reward_status = 'pending'),
    (SELECT COALESCE(sum(r.reward_amount), 0) FROM public.referrals r
       WHERE r.referrer_id = auth.uid() AND r.reward_status = 'approved'),
    (SELECT COALESCE(sum(r.reward_amount), 0) FROM public.referrals r
       WHERE r.referrer_id = auth.uid() AND r.reward_status = 'paid');
$$;

REVOKE ALL ON FUNCTION public.my_referral_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.my_referral_stats() TO authenticated;

/**
 * Who the caller has referred, newest first.
 *
 * The name comes from here rather than a join in the browser because a
 * referrer has no business reading the profiles table for someone who merely
 * signed up through their link. A first name and an initial is enough to
 * recognise the person you invited; the full address is not shown.
 */
CREATE OR REPLACE FUNCTION public.my_referrals()
RETURNS TABLE (
  id                uuid,
  display_name      text,
  signed_up_at      timestamptz,
  first_purchase_at timestamptz,
  purchase_count    int,
  revenue           numeric,
  reward_amount     numeric,
  reward_status     text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    r.id,
    COALESCE(
      NULLIF(split_part(btrim(p.full_name), ' ', 1), '') ||
        CASE
          WHEN split_part(btrim(p.full_name), ' ', 2) <> ''
          THEN ' ' || left(split_part(btrim(p.full_name), ' ', 2), 1) || '.'
          ELSE ''
        END,
      'A member'
    ),
    r.signed_up_at,
    r.first_purchase_at,
    r.purchase_count,
    r.revenue,
    r.reward_amount,
    r.reward_status
  FROM public.referrals r
  LEFT JOIN public.profiles p ON p.id = r.referred_user_id
  WHERE r.referrer_id = auth.uid()
  ORDER BY r.signed_up_at DESC;
$$;

REVOKE ALL ON FUNCTION public.my_referrals() FROM public;
GRANT EXECUTE ON FUNCTION public.my_referrals() TO authenticated;

-- --------------------------------------------------------------- realtime --

-- So the page updates the moment a click, signup or purchase lands, rather
-- than when someone remembers to refresh. RLS still decides what a subscriber
-- receives, so a member is only ever woken by their own rows.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_visits;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Realtime sends old-row identity for updates and deletes; without this a
-- subscriber sees an update land but cannot tell which row it was.
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
