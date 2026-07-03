CREATE TABLE leak_detection_policies (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('organization', 'building', 'unit', 'meter')),
  scope_id text,
  minimum_interval_usage numeric NOT NULL CHECK (minimum_interval_usage >= 0),
  minimum_consecutive_intervals integer NOT NULL CHECK (minimum_consecutive_intervals >= 2),
  maximum_interval_gap_minutes integer NOT NULL CHECK (maximum_interval_gap_minutes > 0),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  enabled boolean NOT NULL DEFAULT true,
  CHECK (
    (scope_type = 'organization' AND scope_id IS NULL)
    OR (scope_type <> 'organization' AND scope_id IS NOT NULL)
  )
);

CREATE INDEX leak_detection_policies_organization_idx
  ON leak_detection_policies (organization_id, enabled);
CREATE INDEX leak_detection_policies_scope_idx
  ON leak_detection_policies (organization_id, scope_type, scope_id);
