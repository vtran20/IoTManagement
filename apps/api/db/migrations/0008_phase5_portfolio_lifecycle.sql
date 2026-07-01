ALTER TABLE buildings
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'archived')),
  ADD COLUMN archived_at timestamptz;

ALTER TABLE floors
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'archived')),
  ADD COLUMN archived_at timestamptz;

ALTER TABLE units
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'archived')),
  ADD COLUMN archived_at timestamptz;

ALTER TABLE meters
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('active', 'archived')),
  ADD COLUMN archived_at timestamptz;

CREATE INDEX buildings_organization_lifecycle_idx
  ON buildings (organization_id, lifecycle_status);
CREATE INDEX floors_building_lifecycle_idx
  ON floors (building_id, lifecycle_status);
CREATE INDEX units_building_lifecycle_idx
  ON units (building_id, lifecycle_status);
CREATE INDEX meters_building_lifecycle_idx
  ON meters (building_id, lifecycle_status);
