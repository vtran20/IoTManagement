CREATE TABLE usage_aggregates (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  meter_id text NOT NULL REFERENCES meters(id),
  building_id text NOT NULL REFERENCES buildings(id),
  unit_id text REFERENCES units(id),
  utility_type text NOT NULL CHECK (utility_type IN ('water', 'electric')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('hour', 'day', 'month')),
  usage_value numeric NOT NULL CHECK (usage_value >= 0),
  cost_estimate numeric,
  UNIQUE (meter_id, period_start, period_end, period_type)
);

CREATE INDEX usage_aggregates_organization_id_idx ON usage_aggregates (organization_id);
CREATE INDEX usage_aggregates_building_id_idx ON usage_aggregates (building_id);
CREATE INDEX usage_aggregates_unit_id_idx ON usage_aggregates (unit_id);
CREATE INDEX usage_aggregates_period_idx ON usage_aggregates (period_type, period_start, period_end);

CREATE TABLE alert_rules (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  utility_type text CHECK (utility_type IN ('water', 'electric')),
  scope_type text NOT NULL CHECK (scope_type IN ('organization', 'building', 'unit', 'meter')),
  scope_id text,
  condition_type text NOT NULL CHECK (
    condition_type IN ('high_usage', 'leak_suspected', 'stale_device', 'outage_suspected')
  ),
  threshold numeric,
  window_minutes integer NOT NULL CHECK (window_minutes > 0),
  enabled boolean NOT NULL DEFAULT true
);

CREATE INDEX alert_rules_organization_id_idx ON alert_rules (organization_id);
CREATE INDEX alert_rules_scope_idx ON alert_rules (scope_type, scope_id);

CREATE TABLE alert_events (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  rule_id text REFERENCES alert_rules(id),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')),
  title text NOT NULL,
  message text NOT NULL,
  triggered_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

CREATE INDEX alert_events_organization_id_idx ON alert_events (organization_id);
CREATE INDEX alert_events_rule_id_idx ON alert_events (rule_id);
CREATE INDEX alert_events_status_idx ON alert_events (status);
CREATE INDEX alert_events_triggered_at_idx ON alert_events (triggered_at DESC);
