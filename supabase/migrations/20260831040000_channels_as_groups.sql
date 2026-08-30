-- Channels as real groups: identity, membership and a closed door.
--
-- Three policies were `USING (true)`:
--
--   channels          -- every channel on the platform listed to everyone
--   channel_members   -- every membership list readable by anyone
--   channel_messages  -- every message in every channel readable by anyone
--
-- The last is the serious one. Channels are where a coach's members talk to
-- each other, and any account could read all of it across every academy. That
-- had to be closed before adding anything on top of it.
--
-- On top: a channel now has a name, a picture, a cover, and a rule for who may
-- post — a WhatsApp-style group where everyone talks, or a Telegram-style
-- channel where the owner broadcasts. Membership can be granted by hand or
-- earned automatically by a role, a service someone bought, or a plan they are
-- on, so a new buyer lands in the right group without anyone adding them.

-- ── Identity ───────────────────────────────────────────────────────────────

ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS coach_id   uuid,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS cover_url  text,
  ADD COLUMN IF NOT EXISTS topic      text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Who may see it at all, and who may speak in it.
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'members',
  ADD COLUMN IF NOT EXISTS post_policy text NOT NULL DEFAULT 'everyone';

DO $$
BEGIN
  ALTER TABLE public.channels
    ADD CONSTRAINT channels_visibility_check
    CHECK (visibility IN ('open', 'members'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.channels
    ADD CONSTRAINT channels_post_policy_check
    CHECK (post_policy IN ('everyone', 'admins'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Existing channels keep behaving as they did: created_by owns them, and a
-- global channel stays open to everyone.
UPDATE public.channels SET coach_id = created_by WHERE coach_id IS NULL;
UPDATE public.channels SET visibility = 'open' WHERE is_global AND visibility = 'members';

CREATE INDEX IF NOT EXISTS channels_coach_idx ON public.channels (coach_id);

-- ── Automatic membership ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.channel_access_rules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,

  -- Exactly one of these is set, according to rule_type.
  rule_type  text NOT NULL CHECK (rule_type IN ('role', 'service', 'plan')),
  role       public.app_role,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  plan_id    uuid REFERENCES public.saas_plans(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT channel_access_rules_shape CHECK (
    (rule_type = 'role'    AND role IS NOT NULL AND service_id IS NULL AND plan_id IS NULL) OR
    (rule_type = 'service' AND service_id IS NOT NULL AND role IS NULL AND plan_id IS NULL) OR
    (rule_type = 'plan'    AND plan_id IS NOT NULL AND role IS NULL AND service_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS channel_access_rules_channel_idx
  ON public.channel_access_rules (channel_id);

CREATE INDEX IF NOT EXISTS channel_members_user_idx
  ON public.channel_members (user_id, channel_id);

-- ── Who is in a channel ────────────────────────────────────────────────────
--
-- SECURITY DEFINER on purpose: it reads channel_members, and a policy on that
-- table calling a function that reads it under RLS would recurse forever.

CREATE OR REPLACE FUNCTION public.can_access_channel(channel uuid, viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = channel
      AND (
        c.coach_id = viewer
        OR c.created_by = viewer
        -- An open channel is the academy noticeboard.
        OR c.visibility = 'open'
        OR c.is_global
      )
  )
  OR public.is_platform_staff(viewer)
  -- Added by hand, or joined.
  OR EXISTS (
    SELECT 1 FROM public.channel_members m
    WHERE m.channel_id = channel AND m.user_id = viewer
  )
  -- Or earned it: a role, a service they hold, or a plan they are on.
  OR EXISTS (
    SELECT 1
    FROM public.channel_access_rules r
    WHERE r.channel_id = channel
      AND (
        (r.rule_type = 'role' AND public.has_role(viewer, r.role))

        OR (r.rule_type = 'service' AND EXISTS (
              SELECT 1 FROM public.service_users su
              WHERE su.user_id = viewer
                AND su.service_id = r.service_id
                AND su.status = 'active'
                AND (su.expires_at IS NULL OR su.expires_at > now())
           ))

        OR (r.rule_type = 'plan' AND EXISTS (
              SELECT 1 FROM public.coach_subscriptions cs
              WHERE cs.coach_id = viewer
                AND cs.plan_id = r.plan_id
                AND cs.status = 'active'
           ))
      )
  );
$$;

-- Whether this person may speak here, as opposed to only read.
CREATE OR REPLACE FUNCTION public.can_post_in_channel(channel uuid, viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_channel(channel, viewer)
    AND (
      EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel AND c.post_policy = 'everyone' AND NOT c.is_archived
      )
      -- A broadcast channel: the owner, its channel admins, and platform staff.
      OR EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = channel
          AND NOT c.is_archived
          AND (c.coach_id = viewer OR c.created_by = viewer)
      )
      OR EXISTS (
        SELECT 1 FROM public.channel_members m
        WHERE m.channel_id = channel AND m.user_id = viewer AND m.role = 'admin'
      )
      OR public.is_platform_staff(viewer)
    );
$$;

-- ── Policies ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated can view channels" ON public.channels;
CREATE POLICY "Members can view their channels"
  ON public.channels FOR SELECT TO authenticated
  USING (public.can_access_channel(id, auth.uid()));

DROP POLICY IF EXISTS "Members can view channel members" ON public.channel_members;
CREATE POLICY "Members can see who else is in the channel"
  ON public.channel_members FOR SELECT TO authenticated
  USING (public.can_access_channel(channel_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view channel messages" ON public.channel_messages;
CREATE POLICY "Members can read their channels"
  ON public.channel_messages FOR SELECT TO authenticated
  USING (public.can_access_channel(channel_id, auth.uid()));

-- Posting now respects both membership and the channel's own rule, rather than
-- accepting anything from anyone signed in.
DROP POLICY IF EXISTS "Authenticated can send messages" ON public.channel_messages;
CREATE POLICY "Members who may post can post"
  ON public.channel_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_post_in_channel(channel_id, auth.uid()));

-- Joining is for open channels only; anything else is granted, not taken.
DROP POLICY IF EXISTS "Users can join public channels" ON public.channel_members;
CREATE POLICY "Users can join an open channel"
  ON public.channel_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND (c.visibility = 'open' OR c.is_global)
    )
  );

-- ── Rules are managed by whoever owns the channel ──────────────────────────

ALTER TABLE public.channel_access_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can see why they are here" ON public.channel_access_rules;
CREATE POLICY "Members can see why they are here"
  ON public.channel_access_rules FOR SELECT TO authenticated
  USING (public.can_access_channel(channel_id, auth.uid()));

DROP POLICY IF EXISTS "Owners manage channel rules" ON public.channel_access_rules;
CREATE POLICY "Owners manage channel rules"
  ON public.channel_access_rules FOR ALL TO authenticated
  USING (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND (c.coach_id = auth.uid() OR c.created_by = auth.uid())
    )
  )
  WITH CHECK (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND (c.coach_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Anyone may create a channel of their own; they own what they create.
DROP POLICY IF EXISTS "Coaches can manage channels" ON public.channels;

CREATE POLICY "Anyone can create a channel"
  ON public.channels FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND coach_id = auth.uid());

CREATE POLICY "Owners and staff manage channels"
  ON public.channels FOR UPDATE TO authenticated
  USING (coach_id = auth.uid() OR created_by = auth.uid() OR public.is_platform_staff(auth.uid()))
  WITH CHECK (coach_id = auth.uid() OR created_by = auth.uid() OR public.is_platform_staff(auth.uid()));

CREATE POLICY "Owners and staff delete channels"
  ON public.channels FOR DELETE TO authenticated
  USING (coach_id = auth.uid() OR created_by = auth.uid() OR public.is_platform_staff(auth.uid()));

-- Owners add and remove members; a member can still remove themselves.
DROP POLICY IF EXISTS "Coaches can manage members" ON public.channel_members;
CREATE POLICY "Owners manage channel members"
  ON public.channel_members FOR ALL TO authenticated
  USING (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND (c.coach_id = auth.uid() OR c.created_by = auth.uid())
    )
  )
  WITH CHECK (
    public.is_platform_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = channel_id AND (c.coach_id = auth.uid() OR c.created_by = auth.uid())
    )
  );
