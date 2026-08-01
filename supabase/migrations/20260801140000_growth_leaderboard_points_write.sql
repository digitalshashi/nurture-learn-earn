-- The initial growth-module migration only granted SELECT on
-- leaderboard_points, intending writes to go through a service-role rollup
-- job. That job doesn't exist yet, so the client's own point-award upsert
-- (marking an action done) was silently rejected by RLS. Allow a user to
-- write only their own row until a server-side rollup replaces this.

DROP POLICY IF EXISTS "Users write own leaderboard points" ON public.leaderboard_points;
CREATE POLICY "Users write own leaderboard points"
  ON public.leaderboard_points FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own leaderboard points" ON public.leaderboard_points;
CREATE POLICY "Users update own leaderboard points"
  ON public.leaderboard_points FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
