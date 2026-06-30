CREATE TABLE meter_readings (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  meter_id text NOT NULL REFERENCES meters(id),
  measured_at timestamptz NOT NULL,
  utility_type text NOT NULL CHECK (utility_type IN ('water', 'electric')),
  value numeric NOT NULL CHECK (value >= 0),
  unit text NOT NULL CHECK (unit IN ('gallon', 'liter', 'kwh')),
  reading_kind text NOT NULL CHECK (reading_kind IN ('cumulative', 'interval')),
  quality text NOT NULL CHECK (quality IN ('good', 'estimated', 'duplicate', 'invalid')),
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meter_id, measured_at)
);

CREATE INDEX meter_readings_organization_id_idx ON meter_readings (organization_id);
CREATE INDEX meter_readings_meter_id_idx ON meter_readings (meter_id);
CREATE INDEX meter_readings_measured_at_idx ON meter_readings (measured_at);
