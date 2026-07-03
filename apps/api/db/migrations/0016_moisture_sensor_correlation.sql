CREATE TABLE moisture_sensors (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id text NOT NULL REFERENCES buildings(id),
  unit_id text REFERENCES units(id),
  external_id text NOT NULL,
  name text NOT NULL,
  source text NOT NULL CHECK (source IN ('simulated')),
  status text NOT NULL CHECK (status IN ('online', 'offline', 'disabled')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (organization_id, external_id)
);

CREATE INDEX moisture_sensors_organization_building_idx
  ON moisture_sensors (organization_id, building_id, unit_id);

CREATE TABLE moisture_sensor_events (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sensor_id text NOT NULL REFERENCES moisture_sensors(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('dry', 'wet')),
  measured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  UNIQUE (sensor_id, measured_at)
);

CREATE INDEX moisture_sensor_events_sensor_measured_idx
  ON moisture_sensor_events (organization_id, sensor_id, measured_at DESC);

CREATE TABLE incident_sensor_evidence (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  incident_id text NOT NULL REFERENCES leak_incidents(id) ON DELETE CASCADE,
  sensor_id text NOT NULL REFERENCES moisture_sensors(id),
  sensor_event_id text NOT NULL REFERENCES moisture_sensor_events(id),
  created_at timestamptz NOT NULL,
  UNIQUE (sensor_event_id)
);

CREATE INDEX incident_sensor_evidence_incident_idx
  ON incident_sensor_evidence (organization_id, incident_id, created_at);

CREATE TABLE incident_correlation_settings (
  organization_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  moisture_correlation_window_minutes integer NOT NULL DEFAULT 30
    CHECK (moisture_correlation_window_minutes BETWEEN 1 AND 1440),
  updated_at timestamptz NOT NULL
);
