-- Add custom AI chat settings for coaches to support_settings
ALTER TABLE public.support_settings
  ADD COLUMN IF NOT EXISTS ai_chat_name text DEFAULT 'Coach AI',
  ADD COLUMN IF NOT EXISTS ai_chat_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_chat_enabled boolean DEFAULT true;
