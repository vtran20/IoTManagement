CREATE INDEX usage_aggregates_dashboard_window_idx
  ON usage_aggregates (organization_id, period_type, period_start)
  INCLUDE (period_end, utility_type, building_id, unit_id, usage_value, cost_estimate);

CREATE INDEX usage_aggregates_dashboard_building_idx
  ON usage_aggregates (organization_id, period_type, building_id, period_start)
  INCLUDE (period_end, utility_type, unit_id, usage_value, cost_estimate);

CREATE INDEX usage_aggregates_dashboard_utility_idx
  ON usage_aggregates (organization_id, period_type, utility_type, period_start)
  INCLUDE (period_end, building_id, unit_id, usage_value, cost_estimate);

CREATE INDEX alert_events_dashboard_open_idx
  ON alert_events (organization_id, status);
