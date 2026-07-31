
-- Add lead_score and lead_score_label columns to crm_leads
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_score_label text DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS last_scored_at timestamptz;
