
-- The earlier migration partially applied. Add remaining policies that didn't exist.
-- "Users view own service access" may also already exist, so use IF NOT EXISTS pattern via DO block

DO $$
BEGIN
  -- Check and create "Users view own service access" if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own service access' AND tablename = 'service_users') THEN
    CREATE POLICY "Users view own service access" ON public.service_users FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  -- Check and create "Public can view profiles" if not exists  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;
