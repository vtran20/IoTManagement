CREATE TABLE leak_incidents (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  building_id text NOT NULL REFERENCES buildings(id),
  unit_id text REFERENCES units(id),
  meter_id text REFERENCES meters(id),
  source text NOT NULL CHECK (source IN ('manual_report', 'meter_anomaly', 'moisture_sensor')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'acknowledged', 'investigating', 'contained', 'monitoring', 'resolved')),
  title text NOT NULL,
  description text NOT NULL,
  detected_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  investigating_at timestamptz,
  contained_at timestamptz,
  monitoring_at timestamptz,
  resolved_at timestamptz,
  resolution_category text CHECK (resolution_category IN ('leak_fixed', 'false_positive', 'planned_usage', 'sensor_fault', 'other')),
  resolution_note text
);

CREATE INDEX leak_incidents_organization_status_idx
  ON leak_incidents (organization_id, status, detected_at DESC);
CREATE INDEX leak_incidents_building_idx
  ON leak_incidents (organization_id, building_id, detected_at DESC);

CREATE TABLE incident_activities (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  incident_id text NOT NULL REFERENCES leak_incidents(id) ON DELETE CASCADE,
  actor_user_id text REFERENCES users(id),
  type text NOT NULL CHECK (type IN ('opened', 'acknowledged', 'investigating', 'contained', 'monitoring', 'resolved', 'note')),
  summary text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX incident_activities_incident_created_idx
  ON incident_activities (organization_id, incident_id, created_at);
