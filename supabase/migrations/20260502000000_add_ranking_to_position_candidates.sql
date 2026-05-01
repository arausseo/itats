ALTER TABLE position_candidates
  ADD COLUMN IF NOT EXISTS ranking_score         integer,
  ADD COLUMN IF NOT EXISTS ranking_phrase        text,
  ADD COLUMN IF NOT EXISTS ranking_analysis      text,
  ADD COLUMN IF NOT EXISTS ranking_generated_at  timestamptz;
