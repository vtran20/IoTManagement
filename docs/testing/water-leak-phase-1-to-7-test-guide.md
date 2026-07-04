# Water Leak Testing Guide: Phases 1-7

Use this guide to validate the complete water-leak workflow locally, from a manually reported issue through detection, repair, notifications, sensor correlation, analytics, and reporting.

The fastest path is the IntelliJ IDEA Built-in HTTP Client suite in `/http`. It captures tokens and fixture IDs, so requests can build on one another. The test data below is safe to create repeatedly because the suite generates unique meter and sensor external IDs.

## What You Are Testing

```text
Water interval reading or manual report
  -> leak incident
  -> acknowledgement, investigation, containment, monitoring, resolution
  -> work order, notifications, audit trail
  -> moisture evidence and/or baseline evidence
  -> analytics and CSV/PDF reporting
```

An `Organization` is the tenant boundary. North Properties data must never be visible to the South owner. Raw readings and moisture events are immutable after ingestion.

## 1. Prepare Local Services

Use the local Kubernetes product runbook for PostgreSQL and Redis: [local-product-test-runbook.md](../deployment/local-product-test-runbook.md).

After PostgreSQL and Redis are port-forwarded, run these commands from the repository root:

```bash
corepack pnpm build

DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management \
REDIS_URL=redis://127.0.0.1:6379 \
JWT_SESSION_SECRET=local-development-session-secret \
WEB_BASE_URL=http://127.0.0.1:3000 \
corepack pnpm db:migrate

DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management \
REDIS_URL=redis://127.0.0.1:6379 \
JWT_SESSION_SECRET=local-development-session-secret \
WEB_BASE_URL=http://127.0.0.1:3000 \
NODE_ENV=development \
corepack pnpm seed:demo
```

Start the API:

```bash
API_PORT=3001 \
DATABASE_URL=postgresql://iot_local:iot_local_password@127.0.0.1:5432/iot_management \
REDIS_URL=redis://127.0.0.1:6379 \
JWT_SESSION_SECRET=local-development-session-secret \
WEB_BASE_URL=http://127.0.0.1:3000 \
corepack pnpm dev:api
```

Start the dashboard in a second terminal:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001/api/v1 \
corepack pnpm dev:web
```

Check the API:

```bash
curl -s http://127.0.0.1:3001/api/v1/health
```

Expected: `status` is `ok`; PostgreSQL is `ok`; Redis is normally `ok` when port-forwarded.

## 2. IntelliJ HTTP Client Setup

1. Open the repository root in IntelliJ IDEA.
2. Select the `local` environment in the HTTP Client environment selector.
3. Create `http-client.private.env.json` from `http-client.private.env.json.example` only when local credentials or URLs differ from the checked-in demo values. It is Git-ignored.
4. Run [00-system-auth.http](../../http/00-system-auth.http). It stores `ownerToken`, `managerToken`, `viewerToken`, and `southOwnerToken` as global variables.
5. Run [10-portfolio-meters.http](../../http/10-portfolio-meters.http). It creates and stores `testBuildingId`, `testFloorId`, `testUnitId`, `testMeterId`, and `testMeterExternalId`.

Demo users all have password `password123`:

| Purpose | Email |
| --- | --- |
| Full control | `owner@north.example` |
| Operational manager | `manager@north.example` |
| Read-only user | `viewer@north.example` |
| Other-tenant owner | `owner@south.example` |

Do not run [99-auth-cleanup.http](../../http/99-auth-cleanup.http) until all checks are complete; it revokes the owner session.

## 3. Core Test Data

Use the fixture building, unit, and meter created by `10-portfolio-meters.http` for Phases 1-6. It is a water meter with `source: simulated` and interval-reading support.

| Scenario | Readings or input | Expected outcome |
| --- | --- | --- |
| Manual report | Incident title, description, building, optional unit and meter | One `manual_report` incident in `open` state |
| Continuous flow | Three `water`, `interval`, `good` readings: 0.75 gal at 00:00, 00:15, 00:30 | One `meter_anomaly` incident and immutable evidence |
| Invalid ingestion | `water` reading with unit `kwh` | `400` validation error; no incident |
| Duplicate ingestion | Send the identical meter/timestamp twice | Second response has `accepted: false`, `duplicate: true` |
| Gapped flow | Three readings with a gap greater than 20 minutes | No continuous-flow incident for that window |
| Baseline breach | 14 earlier same-hour readings of 1 gal, then 5 gal | One baseline anomaly; threshold is 2 gal at multiplier 2 |

Use timestamps that do not already exist for the same meter. Reading ingestion is idempotent by meter and measured timestamp.

## 4. Phase 1: Manual Incident And Lifecycle

Run [50-water-response.http](../../http/50-water-response.http) through the manual incident request. It creates `testIncidentId`.

Understand the state machine:

```text
open -> acknowledged -> investigating -> contained -> monitoring -> resolved
```

Test it in order:

1. `POST /incidents/manual`.
2. `GET /incidents/{{testIncidentId}}`.
3. `POST /incidents/{{testIncidentId}}/notes`.
4. `POST /incidents/{{testIncidentId}}/acknowledge`.
5. `POST /incidents/{{testIncidentId}}/investigate`.
6. Continue the lifecycle after the work-order check in Phase 3.

Expected result:

- The incident response has `source: "manual_report"`, `status: "open"`, a tenant-scoped building ID, and a detected time.
- The detail response has an `activities` timeline. The first activity is `opened`; the note is immutable.
- Each valid transition returns `200` and adds its timestamp, for example `acknowledgedAt`.
- Attempting to skip a state, such as `open -> contained`, returns `409 INVALID_INCIDENT_TRANSITION`.
- Resolving without `resolutionNote` returns `400 RESOLUTION_NOTE_REQUIRED`.

Dashboard check: open `http://127.0.0.1:3000/incidents`, select the new incident, and confirm the status, note, and timeline are visible.

## 5. Phase 2: Meter-Based Continuous-Flow Detection

Create the policy in `50-water-response.http`:

```json
{
  "scopeType": "meter",
  "scopeId": "{{testMeterId}}",
  "minimumIntervalUsage": 0.5,
  "minimumConsecutiveIntervals": 3,
  "maximumIntervalGapMinutes": 20,
  "severity": "warning",
  "enabled": true
}
```

Then submit these three readings to `POST /api/v1/readings/ingest`, changing only `measuredAt`:

```json
{
  "meterExternalId": "{{testMeterExternalId}}",
  "measuredAt": "2026-08-01T00:00:00.000Z",
  "utilityType": "water",
  "value": 0.75,
  "unit": "gallon",
  "readingKind": "interval"
}
```

Repeat for `00:15:00.000Z` and `00:30:00.000Z`.

Expected result after the third accepted reading:

- `GET /incidents?buildingId={{testBuildingId}}` contains one unresolved incident with `source: "meter_anomaly"`.
- `GET /incidents/{{incidentId}}` contains `evidence`; it identifies the policy, meter, reading IDs, observed usage, threshold usage, and the reading window.
- The incident has estimated excess water and estimated excess cost.
- Repeat the third reading exactly. The ingestion response is a duplicate and no extra incident or evidence is created.
- Send an otherwise valid fourth reading at `02:00:00.000Z`. The gap breaks a new continuous window because it exceeds 20 minutes.

## 6. Phase 3: Repair Work Order

Use the incident after it is `investigating`.

1. `POST /incidents/{{testIncidentId}}/work-orders` with a title, description, and priority.
2. `GET /work-orders?incidentId={{testIncidentId}}`.
3. `PATCH /work-orders/{{testWorkOrderId}}` with `status: "in_progress"`.
4. Patch it again with `status: "completed"` and a non-empty `completionNote`.
5. Finish the incident lifecycle: `contain`, `monitor`, then `resolve` with a category and resolution note.

Expected result:

- Work order status changes are visible in the incident activity timeline.
- A completed work order has `completedAt` and `completionNote`.
- The resolved incident has `resolvedAt`, `resolutionCategory`, and `resolutionNote`.
- `/work-orders` supports filtering by incident, assignee, priority, status, and overdue state.

Dashboard checks:

- `http://127.0.0.1:3000/incidents/{{testIncidentId}}` shows evidence, work order, and repair history.
- `http://127.0.0.1:3000/work-orders` shows the work order and its current status.

## 7. Phase 4: Water Operations Dashboard

With the owner session, verify:

1. `/incidents` shows incident rows, severity, source, status, and building context.
2. Opening an incident shows the timeline, meter evidence, sensor evidence when present, and work orders.
3. `/work-orders` permits owner or manager changes.

Then log out and sign in as `viewer@north.example`.

Expected result:

- Viewer can see incidents, details, evidence, and work orders.
- Viewer does not see or cannot use acknowledge, lifecycle, create-work-order, or work-order-update actions.
- Direct mutation attempts return `403 ROLE_FORBIDDEN`.

## 8. Phase 5: Notifications And Escalation

Open a new manual incident or trigger a new continuous-flow incident. Then run these requests in `50-water-response.http`:

- `GET /notifications`
- `POST /notifications/{{testNotificationId}}/read`
- `GET /incident-responder-settings`
- `PATCH /incident-responder-settings`

Expected result:

- Active owners and managers receive in-app notifications for an opened incident. Viewers do not.
- Repeating the same detection does not duplicate a notification with the same incident/kind/recipient combination.
- Marking a notification read sets `readAt` only for the current member.
- When email is enabled, `GET /dev/email-outbox` shows development email entries rather than sending a real email.

Optional worker check: start `corepack pnpm --filter @iot-management/api start:worker` with the same `DATABASE_URL` and `REDIS_URL` as the API. Set a short acknowledgement deadline in responder settings, create a new warning or critical incident, and leave it unacknowledged. The worker creates the overdue escalation notification after the configured deadline.

## 9. Phase 6: Moisture Sensor Correlation

First make sure there is an open meter anomaly for `testMeterId`, then run [60-moisture-sensors.http](../../http/60-moisture-sensors.http).

For a correlation test, do not use the fixed example time blindly. Instead:

1. Read the target incident and copy its `detectedAt`.
2. Set `moistureCorrelationWindowMinutes` to `30`.
3. Send a `wet` sensor event for the same building and unit within 30 minutes of `detectedAt`.
4. Re-read the incident.

Expected result:

- The wet event is immutable and appears in `GET /moisture-sensors/{{testSensorId}}/events`.
- The event response has `correlated: true` and references the existing incident.
- The incident detail includes `sensorEvidence` for that sensor event.
- Send the same sensor ID and timestamp again. The response has `duplicate: true`.
- A wet event outside the time window, or for another building/unit, does not correlate. It opens a separate `moisture_sensor` incident instead.

## 10. Phase 7: Analytics, Reports, And Baseline Detection

### Analytics and reports

After there are at least one or two incidents, run:

```text
GET /api/v1/incidents/analytics?period=30d&buildingId={{testBuildingId}}
GET /api/v1/reports/leak-response?period=30d&buildingId={{testBuildingId}}
GET /api/v1/reports/leak-response/export?format=csv&period=30d&buildingId={{testBuildingId}}
GET /api/v1/reports/leak-response/export?format=pdf&period=30d&buildingId={{testBuildingId}}
```

Expected JSON fields:

- `incidentCount`
- `responseTime.acknowledged`, `contained`, and `resolved`, each with count, average, and median when data exists
- `excessWater.gallons` and `estimatedCost`
- `recurringLocations`
- `resolutionOutcomes`

Expected export behavior:

- CSV is a metric/value report, including response-time and recurrence rows.
- PDF downloads with content type `application/pdf` and begins with `%PDF-`.
- `format=spreadsheet` returns `400 LEAK_REPORT_FORMAT_INVALID`.
- Each export creates a `report.exported` audit event.

Dashboard check: open `http://127.0.0.1:3000/reports`. Confirm the Monthly Usage Report remains visible and the Leak Response Report shows incident count, acknowledgement/resolution medians, excess water/cost, recurring locations, resolution outcomes, and both download actions.

### Baseline detector

Use a **new water meter with no continuous-flow policy**. Otherwise the Phase 2 policy can intentionally create a different anomaly before the baseline condition is evaluated.

1. Create the new meter under `testBuildingId` using `POST /meters`; save its ID and external ID.
2. As owner, enable baseline detection:

```json
PATCH /api/v1/leak-baseline-settings
{
  "enabled": true,
  "thresholdMultiplier": 2
}
```

3. Submit 14 accepted water interval readings, each at `08:00:00.000Z`, on 14 different UTC days. Use `value: 1` and `unit: "gallon"`.

```text
2026-06-01T08:00:00.000Z through 2026-06-14T08:00:00.000Z
```

4. Submit the breach reading:

```json
{
  "meterExternalId": "<new-meter-external-id>",
  "measuredAt": "2026-06-15T08:00:00.000Z",
  "utilityType": "water",
  "value": 5,
  "unit": "gallon",
  "readingKind": "interval"
}
```

Expected result:

- The baseline is 1 gallon; the threshold is `1 x 2 = 2` gallons.
- The 5-gallon reading creates one open `meter_anomaly` incident with title `Water usage exceeded baseline`.
- The incident estimates approximately 3 gallons excess water.
- Its evidence has no policy ID because it is baseline evidence, not continuous-flow policy evidence.
- Submit a second 5-gallon reading at `2026-06-16T08:00:00.000Z`. The unresolved incident is reused and gains another evidence row; it does not create a second unresolved baseline incident for the meter.

Negative checks:

- With only 13 historical same-hour days, the breach does not open an incident.
- An invalid, duplicate, non-water, cumulative, or different-hour reading does not contribute to the baseline.
- `PATCH /leak-baseline-settings` returns `403 ROLE_FORBIDDEN` for manager and viewer; all authenticated North users may read the setting.

## 11. Tenant Isolation And Audit Verification

Use `southOwnerToken` from `00-system-auth.http`:

```text
GET /buildings/{{testBuildingId}}
Authorization: Bearer {{southOwnerToken}}
```

Expected: `404`, not a North building response.

Then, as the North owner, read:

```text
GET /audit/events?limit=100
```

Expected audit actions include incident creation/transitions, note creation, responder-setting updates, baseline-setting updates, detection events, and report exports. Every returned record has `organizationId: "org_north"` and never includes passwords, bearer tokens, or reset tokens.

## 12. Automated Regression Checks

Run after manual testing or before merging a change:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm validate:http-client
```

Expected result: all commands exit successfully. The API e2e tests require a reachable local PostgreSQL instance. The web e2e tests start a temporary Next.js server.

## Troubleshooting

| Symptom | Likely cause | Check |
| --- | --- | --- |
| `401 UNAUTHENTICATED` | Token expired or login request not run | Rerun owner login in `00-system-auth.http` |
| `404` for a fixture ID | Requests were run out of order, the API was reset, or another tenant is used | Rerun `10-portfolio-meters.http` and authenticate as North owner |
| Duplicate reading response | Same meter/timestamp was already accepted | Use a new timestamp; duplicates are expected to be safe |
| No continuous-flow incident | Fewer than 3 readings, usage under threshold, invalid reading, or gap too large | Use three good 0.75-gallon readings 15 minutes apart |
| No moisture correlation | Wrong building/unit or event outside the configured window | Use the incident `detectedAt` plus less than 30 minutes |
| No baseline incident | Baseline disabled, fewer than 14 prior same-hour days, or a meter with a policy | Use a new policy-free meter and the exact 14-day dataset above |
| API e2e cannot connect | PostgreSQL is not reachable from the host | Keep `kubectl port-forward svc/postgres 5432:5432` open |
