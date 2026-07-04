ALTER TABLE incident_evidence
  ALTER COLUMN policy_id DROP NOT NULL;

CREATE TABLE leak_baseline_settings (
  organization_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  minimum_valid_days integer NOT NULL DEFAULT 14 CHECK (minimum_valid_days = 14),
  threshold_multiplier numeric(8, 3) NOT NULL DEFAULT 2
    CHECK (threshold_multiplier >= 1.1 AND threshold_multiplier <= 10),
  updated_at timestamptz NOT NULL
);
