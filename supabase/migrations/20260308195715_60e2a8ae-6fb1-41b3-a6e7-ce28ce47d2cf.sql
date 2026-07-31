
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_tier text DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS enable_levelup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_gamification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_community boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_leaderboard boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_quests boolean NOT NULL DEFAULT false;
