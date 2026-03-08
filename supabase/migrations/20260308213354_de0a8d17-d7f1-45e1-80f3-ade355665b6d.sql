
-- Tighten user_badges RLS: only admins can insert/delete
DROP POLICY IF EXISTS "Coaches insert user badges" ON public.user_badges;
DROP POLICY IF EXISTS "Coaches delete user badges" ON public.user_badges;

CREATE POLICY "Admins insert user badges" ON public.user_badges
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete user badges" ON public.user_badges
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );
