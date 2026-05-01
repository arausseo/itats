ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_sha256 text;

CREATE UNIQUE INDEX IF NOT EXISTS candidates_org_sha256_uniq
  ON candidates (organization_id, cv_sha256)
  WHERE cv_sha256 IS NOT NULL;
