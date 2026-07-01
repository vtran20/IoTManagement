CREATE TABLE organization_utility_rates (
  organization_id text PRIMARY KEY REFERENCES organizations(id),
  water_per_gallon numeric NOT NULL CHECK (water_per_gallon >= 0),
  electric_per_kwh numeric NOT NULL CHECK (electric_per_kwh >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO organization_utility_rates (
  organization_id,
  water_per_gallon,
  electric_per_kwh
)
SELECT id, 0.005, 0.15
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;
