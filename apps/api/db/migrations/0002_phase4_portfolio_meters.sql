CREATE TABLE buildings (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  address text,
  timezone text NOT NULL
);

CREATE INDEX buildings_organization_id_idx ON buildings (organization_id);

CREATE TABLE floors (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  building_id text NOT NULL REFERENCES buildings(id),
  name text NOT NULL,
  level integer NOT NULL
);

CREATE INDEX floors_organization_id_idx ON floors (organization_id);
CREATE INDEX floors_building_id_idx ON floors (building_id);

CREATE TABLE units (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  building_id text NOT NULL REFERENCES buildings(id),
  floor_id text REFERENCES floors(id),
  name text NOT NULL,
  occupancy_status text NOT NULL CHECK (occupancy_status IN ('occupied', 'vacant', 'maintenance'))
);

CREATE INDEX units_organization_id_idx ON units (organization_id);
CREATE INDEX units_building_id_idx ON units (building_id);
CREATE INDEX units_floor_id_idx ON units (floor_id);

CREATE TABLE meters (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  building_id text NOT NULL REFERENCES buildings(id),
  floor_id text REFERENCES floors(id),
  unit_id text REFERENCES units(id),
  utility_type text NOT NULL CHECK (utility_type IN ('water', 'electric')),
  source text NOT NULL CHECK (source IN ('simulated', 'gateway', 'direct_api', 'mqtt')),
  external_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('online', 'offline', 'stale', 'disabled')),
  installed_at timestamptz,
  last_reading_at timestamptz,
  UNIQUE (organization_id, external_id)
);

CREATE INDEX meters_organization_id_idx ON meters (organization_id);
CREATE INDEX meters_building_id_idx ON meters (building_id);
CREATE INDEX meters_unit_id_idx ON meters (unit_id);
