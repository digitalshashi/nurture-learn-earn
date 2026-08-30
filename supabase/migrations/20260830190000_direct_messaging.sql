-- Direct messaging that can carry a real inbox.
--
-- The table and its policies already existed and the page already read them,
-- so this is not a new feature so much as the parts that were missing to make
-- it usable:
--
--   * The conversation list was built by pulling the last 200 messages to the
--     browser and grouping them in JavaScript. A coach with more traffic than
--     that simply loses older conversations off the list, and every visit
--     ships a few hundred rows to draw a dozen names. It belongs in SQL.
--   * Nothing recorded *when* a message was read, so there was no way to show
--     a sender that it had been.
--   * Anyone could message anyone. On a platform where every buyer's address
--     is a row in profiles, that is a spam channel with a UI on it.

-- --------------------------------------------------------------- receipts --

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Existing read messages have no timestamp to recover; treat them as read at
-- the moment they were sent rather than leaving a null the UI has to special
-- case forever.
UPDATE public.messages SET read_at = created_at WHERE is_read AND read_at IS NULL;

-- Fetching one thread, newest first, and counting unread per sender are the
-- only two shapes this table is ever queried in.
CREATE INDEX IF NOT EXISTS messages_pair_idx
  ON public.messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_unread_idx
  ON public.messages (receiver_id, sender_id)
  WHERE NOT is_read;

-- ------------------------------------------------------------- who may DM --

-- Replaces "Users can send messages", which only checked that you were not
-- forging the sender. It let any signed-in account message any other account
-- on the platform.
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Users message people they are connected to"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND receiver_id <> sender_id
    AND (
      -- Staff can reach anyone; support has to be able to answer.
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      -- A coach may message someone who bought from them or enrolled with
      -- them, and that person may reply. belongs_to_tenant already encodes
      -- exactly that relationship, in both directions.
      OR public.belongs_to_tenant(receiver_id, auth.uid())
      OR public.belongs_to_tenant(auth.uid(), receiver_id)
    )
  );

-- -------------------------------------------------------------- the inbox --

/**
 * One row per person you have ever exchanged messages with: their name, the
 * last thing either of you said, and how much of theirs you have not read.
 *
 * SECURITY INVOKER, so the policies on messages are what decide which rows
 * exist here — this function widens nothing.
 */
CREATE OR REPLACE FUNCTION public.conversation_summaries()
RETURNS TABLE (
  other_user_id uuid,
  full_name text,
  avatar_url text,
  last_message text,
  last_at timestamptz,
  last_sender_id uuid,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH mine AS (
    SELECT
      m.*,
      CASE WHEN m.sender_id = auth.uid() THEN m.receiver_id ELSE m.sender_id END AS other_id
    FROM public.messages m
    WHERE m.sender_id = auth.uid() OR m.receiver_id = auth.uid()
  ),
  latest AS (
    SELECT DISTINCT ON (other_id) other_id, message, created_at, sender_id
    FROM mine
    ORDER BY other_id, created_at DESC
  ),
  unread AS (
    SELECT other_id, count(*) AS c
    FROM mine
    WHERE receiver_id = auth.uid() AND NOT is_read
    GROUP BY other_id
  )
  SELECT
    l.other_id,
    p.full_name,
    p.avatar_url,
    l.message,
    l.created_at,
    l.sender_id,
    COALESCE(u.c, 0)
  FROM latest l
  LEFT JOIN public.profiles p ON p.id = l.other_id
  LEFT JOIN unread u ON u.other_id = l.other_id
  ORDER BY l.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.conversation_summaries() TO authenticated;

/** Total unread, for the badge in the navigation. */
CREATE OR REPLACE FUNCTION public.unread_message_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)
  FROM public.messages
  WHERE receiver_id = auth.uid() AND NOT is_read;
$$;

GRANT EXECUTE ON FUNCTION public.unread_message_count() TO authenticated;

/**
 * Marks everything from one person as read.
 *
 * Doing this in one statement rather than as a filtered UPDATE from the
 * browser is what guarantees read_at is always set alongside is_read; the two
 * drifting apart is how a "seen" tick ends up with nothing behind it.
 */
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_other_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.messages
  SET is_read = true, read_at = now()
  WHERE receiver_id = auth.uid()
    AND sender_id = _other_user_id
    AND NOT is_read;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- ------------------------------------------------------------- who to msg --

/**
 * The people the caller is allowed to start a conversation with.
 *
 * For a coach that is everyone who bought a service or enrolled in a course of
 * theirs; for a student it is the coaches they bought from. Staff see
 * everyone, because they have to be able to answer anyone.
 *
 * SECURITY DEFINER because it reads enrollments and service_users across the
 * whole platform to work out that relationship — the same reason
 * belongs_to_tenant is. It returns nothing but a name and an avatar, and only
 * for people the caller is already permitted to write to under the INSERT
 * policy above.
 */
CREATE OR REPLACE FUNCTION public.messageable_people(_search text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  relationship text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS id),
  staff AS (
    SELECT public.has_role((SELECT id FROM me), 'admin')
        OR public.has_role((SELECT id FROM me), 'super_admin') AS is_staff
  ),
  candidates AS (
    -- People who bought from me or enrolled with me.
    SELECT su.user_id, 'student'::text AS relationship
    FROM public.service_users su
    JOIN public.services s ON s.id = su.service_id
    WHERE s.coach_id = (SELECT id FROM me)

    UNION
    SELECT e.user_id, 'student'::text
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE c.coach_id = (SELECT id FROM me)

    -- Coaches I bought from or enrolled with.
    UNION
    SELECT s.coach_id, 'coach'::text
    FROM public.service_users su
    JOIN public.services s ON s.id = su.service_id
    WHERE su.user_id = (SELECT id FROM me)

    UNION
    SELECT c.coach_id, 'coach'::text
    FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.user_id = (SELECT id FROM me)

    -- Staff can reach anyone at all.
    UNION
    SELECT p.id, 'member'::text
    FROM public.profiles p
    WHERE (SELECT is_staff FROM staff)
  )
  SELECT DISTINCT ON (p.id)
    p.id,
    p.full_name,
    p.avatar_url,
    c.relationship
  FROM candidates c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE p.id <> (SELECT id FROM me)
    AND (
      _search IS NULL
      OR _search = ''
      OR p.full_name ILIKE '%' || _search || '%'
      OR p.email ILIKE '%' || _search || '%'
    )
  ORDER BY p.id, c.relationship
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.messageable_people(text) FROM public;
GRANT EXECUTE ON FUNCTION public.messageable_people(text) TO authenticated;
