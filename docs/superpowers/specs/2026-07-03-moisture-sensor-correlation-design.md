# Moisture Sensor Correlation Design

## Goal

Extend the water leak workflow with simulated moisture sensors and immutable wet/dry events. A wet event correlates with an unresolved meter-anomaly incident in the same tenant when the event shares the most precise available resource context and falls inside a configurable 30-minute window.

## Decisions

- A moisture sensor belongs to one organization and one building, with an optional unit assignment. Phase 6 sensors are `simulated`; future gateway protocols use the same normalized event contract.
- A sensor event is immutable after acceptance. It stores the sensor, normalized `wet` or `dry` state, measured timestamp, and received timestamp. `dry` events are retained for history but do not create or correlate incidents.
- Correlation is resource-first:
  1. A unit sensor may correlate only with an unresolved meter-anomaly incident for the same unit.
  2. A building-level sensor may correlate with an unresolved meter-anomaly incident for the same building that has no unit assignment.
  3. The candidate incident must have been detected within the organization setting's window, defaulting to 30 minutes before or after the event timestamp.
- A correlation attaches a separate immutable sensor-evidence record to the existing incident. It does not change the incident source or create a second incident.
- A wet event without a compatible meter-anomaly incident opens one `moisture_sensor` incident and attaches its sensor evidence. Repeating the same event is idempotent by sensor and measured timestamp.
- Organization owners manage the correlation window; owners and managers manage simulated sensors and ingest events; viewers are read-only.

## Persistence

- `moisture_sensors`: tenant-scoped registry with building/unit context, external ID, name, source, status, and timestamps.
- `moisture_sensor_events`: immutable normalized events with a unique `(sensor_id, measured_at)` key.
- `incident_sensor_evidence`: immutable relation between a sensor event and one leak incident.
- `incident_correlation_settings`: one row per organization with a validated `moisture_correlation_window_minutes`, default 30.

## API

- `GET|POST /api/v1/moisture-sensors`
- `GET|PATCH /api/v1/moisture-sensors/:sensorId`
- `POST /api/v1/moisture-sensors/:sensorId/events`
- `GET /api/v1/moisture-sensors/:sensorId/events`
- `GET|PATCH /api/v1/incident-correlation-settings`

`POST .../events` returns the accepted event, the related incident, and whether it correlated with an existing incident. The incident detail response includes `sensorEvidence` so the dashboard can display sensor confirmation alongside meter evidence.

## Safety And Verification

- Every sensor, event, candidate incident, and evidence query is organization-scoped.
- Create/update/ingest operations write audit records.
- Tests cover tenant isolation, immutable duplicate handling, exact resource matching, window boundaries, non-correlating dry events, and the new incident fallback.
