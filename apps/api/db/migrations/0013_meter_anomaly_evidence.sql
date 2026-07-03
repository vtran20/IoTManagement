ALTER TABLE leak_incidents
  ADD COLUMN estimated_excess_water numeric,
  ADD COLUMN estimated_excess_cost numeric;

CREATE TABLE incident_evidence (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  incident_id text NOT NULL REFERENCES leak_incidents(id) ON DELETE CASCADE,
  policy_id text NOT NULL REFERENCES leak_detection_policies(id),
  meter_id text NOT NULL REFERENCES meters(id),
  reading_ids jsonb NOT NULL,
  window_started_at timestamptz NOT NULL,
  window_ended_at timestamptz NOT NULL,
  observed_usage numeric NOT NULL CHECK (observed_usage >= 0),
  threshold_usage numeric NOT NULL CHECK (threshold_usage >= 0),
  created_at timestamptz NOT NULL
);

CREATE INDEX incident_evidence_policy_meter_idx
  ON incident_evidence (organization_id, policy_id, meter_id, created_at DESC);
CREATE INDEX incident_evidence_incident_idx
  ON incident_evidence (organization_id, incident_id, created_at);
