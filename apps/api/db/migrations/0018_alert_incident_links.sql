ALTER TABLE alert_events
  ADD COLUMN incident_id text REFERENCES leak_incidents(id);

CREATE INDEX alert_events_incident_id_idx
  ON alert_events (organization_id, incident_id, triggered_at DESC)
  WHERE incident_id IS NOT NULL;
