CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE candidates
  ADD COLUMN embedding vector(1536);
