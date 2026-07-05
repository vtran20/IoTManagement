# Alert-Incident Correlation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let owners and managers manually create or link a water-leak incident from an alert while preserving independent lifecycles and strict tenant isolation.

**Architecture:** Store an optional `incident_id` on `alert_events`, which gives one incident many supporting alerts. Introduce two persistence operations: one atomic operation that creates an incident and links its initiating alert, and one guarded operation that links an existing non-resolved incident. The REST API returns enriched alert summaries, and the dashboard exposes deliberate actions only to owners and managers.

**Tech Stack:** NestJS 11 REST API, TypeScript, PostgreSQL/Kysely, Vitest/Supertest, Next.js 16, React 19, TanStack Query, Playwright.

---

## File Structure

- Create: `apps/api/db/migrations/0018_alert_incident_links.sql` — durable relationship column, foreign key, and indexes.
- Modify: `packages/types/src/domain.ts` — optional `AlertEvent.incidentId` and compact incident summary type.
- Modify: `packages/types/src/api.ts` — create/link request and response contracts; enriched incident detail response.
- Modify: `apps/api/src/database/schema.ts` — Kysely `AlertEventRow.incident_id` mapping.
- Modify: `apps/api/src/persistence/persistence.service.ts` — tenant-scoped relationship methods.
- Modify: `apps/api/src/persistence/in-memory-persistence.service.ts` — unit-test implementation of linking behavior.
- Modify: `apps/api/src/persistence/postgres-persistence.service.ts` — transactional PostgreSQL implementation.
- Create: `apps/api/src/alerts/dto/link-alert-incident.dto.ts` — validated existing-incident link request.
- Modify: `apps/api/src/alerts/alert-events.service.ts` — list enrichment and existing-incident linking.
- Modify: `apps/api/src/incidents/leak-incidents.service.ts` — create-from-alert workflow reusing manual incident validation.
- Modify: `apps/api/src/alerts/alerts.controller.ts` — owner/manager mutation endpoints.
- Modify: `apps/api/src/openapi/openapi.controller.ts` — endpoint summaries.
- Modify: `apps/api/test/incidents.e2e-spec.ts` — API, tenant isolation, lifecycle, and role regression coverage.
- Modify: `apps/web-dashboard/features/alerts/alerts-table.tsx` — relationship column and compact create/link flows.
- Modify: `apps/web-dashboard/features/incidents/incident-detail.tsx` — related-alerts panel.
- Modify: `apps/web-dashboard/tests/water-operations.spec.ts` — owner/manager/viewer dashboard behavior.
- Modify: `apps/web-dashboard/tests/auth-fixture.ts` — alert/incident route mocks for correlation actions.
- Modify: `http/30-alerts-reports-audit.http` — IntelliJ HTTP Client examples.

### Task 1: Persist And Type The Relationship

**Files:**
- Create: `apps/api/db/migrations/0018_alert_incident_links.sql`
- Modify: `packages/types/src/domain.ts`
- Modify: `packages/types/src/api.ts`
- Modify: `apps/api/src/database/schema.ts`
- Test: `apps/api/test/incidents.e2e-spec.ts`

- [ ] **Step 1: Write failing API contract assertions**

Add a test fixture alert and assertions that a linked alert response contains its incident id and compact related-incident summary:

```ts
expect(response.body.alert).toMatchObject({
  incidentId: response.body.incident.id,
  incident: {
    id: response.body.incident.id,
    status: "open",
    title: "Kitchen water report",
  },
});
```

- [ ] **Step 2: Run the focused test to establish the red state**

Run:

```bash
corepack pnpm --dir apps/api exec vitest run --config vitest.e2e.config.ts test/incidents.e2e-spec.ts
```

Expected: the new alert-to-incident endpoint test fails because the route and relationship field do not exist.

- [ ] **Step 3: Add the database migration**

Create `0018_alert_incident_links.sql`:

```sql
ALTER TABLE alert_events
  ADD COLUMN incident_id text REFERENCES leak_incidents(id);

CREATE INDEX alert_events_incident_id_idx
  ON alert_events (organization_id, incident_id, triggered_at DESC)
  WHERE incident_id IS NOT NULL;
```

The column is nullable so existing alert records remain valid. Do not add a unique constraint because one incident may collect many alerts.

- [ ] **Step 4: Add shared contracts and Kysely mapping**

Add these domain/API shapes:

```ts
export interface AlertIncidentSummary {
  id: EntityId;
  status: LeakIncidentStatus;
  title: string;
}

export interface AlertEvent {
  // existing fields
  incidentId?: EntityId;
}

export interface AlertEventResponse extends AlertEvent {
  incident?: AlertIncidentSummary;
}

export interface LinkAlertIncidentRequest {
  incidentId: EntityId;
}

export interface CreateIncidentFromAlertResponse {
  alert: AlertEventResponse;
  incident: LeakIncidentResponse;
}

export interface LeakIncidentDetailResponse extends LeakIncident {
  // existing fields
  relatedAlerts: AlertEventResponse[];
}
```

Add `incident_id: string | null` to `AlertEventRow`. Keep `AlertEvent` as the stored domain entity; only `AlertEventResponse` carries the display summary.

- [ ] **Step 5: Run the focused test and type check**

Run:

```bash
corepack pnpm --filter @iot-management/types typecheck
corepack pnpm --filter @iot-management/api typecheck
```

Expected: contracts compile; the endpoint test remains red until Task 3.

- [ ] **Step 6: Commit the schema contract**

```bash
git add apps/api/db/migrations/0018_alert_incident_links.sql apps/api/src/database/schema.ts packages/types/src/domain.ts packages/types/src/api.ts apps/api/test/incidents.e2e-spec.ts
git commit -m "feat: add alert incident relationship schema"
```

### Task 2: Add Tenant-Safe Persistence Operations

**Files:**
- Modify: `apps/api/src/persistence/persistence.service.ts`
- Modify: `apps/api/src/persistence/in-memory-persistence.service.ts`
- Modify: `apps/api/src/persistence/postgres-persistence.service.ts`
- Test: `apps/api/src/alerts/alert-events.service.spec.ts` (create if absent)

- [ ] **Step 1: Write failing persistence tests**

Cover an existing alert linked to an active incident, a second link attempt, and a resolved incident:

```ts
await expect(
  service.linkToIncident(ownerContext, alert.id, resolvedIncident.id),
).rejects.toMatchObject({ code: "INCIDENT_ALREADY_RESOLVED" });

await service.linkToIncident(ownerContext, alert.id, activeIncident.id);
await expect(
  service.linkToIncident(ownerContext, alert.id, activeIncident.id),
).rejects.toMatchObject({ code: "ALERT_ALREADY_LINKED" });
```

- [ ] **Step 2: Run the focused unit test to establish the red state**

Run:

```bash
corepack pnpm --filter @iot-management/api test -- src/alerts/alert-events.service.spec.ts
```

Expected: FAIL because no link operation exists.

- [ ] **Step 3: Extend the persistence interface**

Add these methods to `PersistenceService`:

```ts
linkAlertToIncident(input: {
  alertId: string;
  incidentId: string;
  organizationId: string;
}): MaybePromise<AlertEvent | undefined>;

createManualIncidentFromAlert(input: {
  actorUserId: string;
  alertId: string;
  buildingId: string;
  description: string;
  detectedAt: string;
  incidentActivitySummary: string;
  organizationId: string;
  severity: AlertSeverity;
  title: string;
  unitId?: string;
  meterId?: string;
}): MaybePromise<{ alert: AlertEvent; incident: LeakIncident } | undefined>;

listAlertEvents(input: {
  incidentId?: string;
  organizationId: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
}): MaybePromise<AlertEvent[]>;
```

`undefined` from a guarded link means the alert was already linked or no longer exists; service code must fetch first and turn that outcome into a tenant-safe not-found or `ALERT_ALREADY_LINKED` error.

- [ ] **Step 4: Implement the in-memory operations**

Update the stored `AlertEvent` object through `incidentId`, filter `listAlertEvents` by optional `incidentId`, and implement `createManualIncidentFromAlert` by creating the standard incident, assigning `alert.incidentId`, creating the opened activity, and recording both audit entries through the existing in-memory APIs.

Keep it synchronous, matching the current in-memory repository style.

- [ ] **Step 5: Implement PostgreSQL operations atomically**

Make `nextId` accept an optional Kysely executor so it can run inside a transaction:

```ts
private async nextId(
  kind: string,
  seed: string,
  tableName: keyof DatabaseSchema,
  executor: Kysely<DatabaseSchema> | Transaction<DatabaseSchema> = this.database.db,
): Promise<string> { /* query against executor */ }
```

Implement `createManualIncidentFromAlert` with `this.database.db.transaction().execute(async (trx) => { ... })`:

1. Select the alert by `organization_id` and `id`; return `undefined` when absent or already linked.
2. Insert the incident with `status: "open"` and `source: "manual_report"`.
3. Update the alert with `incident_id` only where `incident_id IS NULL`; return the updated row.
4. Insert the `opened` incident activity.
5. Insert `leak_incident.created` and `alert.linked_to_incident` audit rows.
6. Return mapped alert and incident from the transaction.

Implement `linkAlertToIncident` as a guarded update that requires matching organization and `incident_id IS NULL`. Extend `updateAlertEvent` only if it is needed for this method; do not let generic lifecycle callers set `incidentId`.

- [ ] **Step 6: Run the focused persistence and service tests**

Run:

```bash
corepack pnpm --filter @iot-management/api test -- src/alerts/alert-events.service.spec.ts
corepack pnpm --filter @iot-management/api typecheck
```

Expected: PASS. The second link attempt cannot overwrite the original association.

- [ ] **Step 7: Commit persistence support**

```bash
git add apps/api/src/persistence/persistence.service.ts apps/api/src/persistence/in-memory-persistence.service.ts apps/api/src/persistence/postgres-persistence.service.ts apps/api/src/alerts/alert-events.service.spec.ts
git commit -m "feat: persist alert incident links"
```

### Task 3: Expose Manual Correlation Through REST

**Files:**
- Create: `apps/api/src/alerts/dto/link-alert-incident.dto.ts`
- Modify: `apps/api/src/alerts/alert-events.service.ts`
- Modify: `apps/api/src/incidents/leak-incidents.service.ts`
- Modify: `apps/api/src/alerts/alerts.controller.ts`
- Modify: `apps/api/src/openapi/openapi.controller.ts`
- Modify: `apps/api/test/incidents.e2e-spec.ts`

- [ ] **Step 1: Write failing e2e cases**

Add tests for:

```ts
POST /api/v1/alerts/:alertId/incidents
POST /api/v1/alerts/:alertId/link-incident
```

The test suite must prove owner and manager success, viewer `403`, cross-organization `404`, resolved target `409` with `INCIDENT_ALREADY_RESOLVED`, and already-linked alert `409` with `ALERT_ALREADY_LINKED`.

- [ ] **Step 2: Run the e2e file to establish the red state**

Run:

```bash
corepack pnpm --dir apps/api exec vitest run --config vitest.e2e.config.ts test/incidents.e2e-spec.ts
```

Expected: the new endpoint cases fail with 404 before the controller routes are added.

- [ ] **Step 3: Implement service validation and create-from-alert**

Refactor the existing building/unit/meter checks in `LeakIncidentsService.createManual` into a private method:

```ts
private async validateManualContext(
  organizationId: string,
  dto: CreateManualLeakIncidentDto,
): Promise<{ buildingId: string; unitId?: string; meterId?: string }> { /* existing validation */ }
```

Add `createFromAlert(context, alertId, dto)`. It must:

1. Find the alert in `context.organization.id`; return `TENANT_RESOURCE_NOT_FOUND` when absent.
2. Throw `ALERT_ALREADY_LINKED` with `409` when `alert.incidentId` exists.
3. Reuse `validateManualContext`.
4. Call `createManualIncidentFromAlert` with actor id, current timestamp, and validated IDs.
5. Call `notifyIncidentOpened` only after the transaction succeeds.
6. Return `{ incident, alert: enrichAlert(alert) }`.

Add `linkToIncident(context, alertId, incidentId)` to `AlertEventsService`. It validates both records in the current organization, rejects a resolved incident, calls guarded persistence linking, writes the `alert.linked_to_incident` audit log, and returns an enriched alert response.

Add an `enrichAlert` helper in `AlertEventsService` that maps an optional `incidentId` to `{ id, title, status }`; use one `listLeakIncidents({ organizationId })` call when listing alerts and `findLeakIncidentById` for a single response.

- [ ] **Step 4: Add DTO, controller, and OpenAPI routes**

Use the existing `CreateManualLeakIncidentDto` for `POST :alertId/incidents`. Define `LinkAlertIncidentDto` as the shared request type:

```ts
import type { LinkAlertIncidentRequest } from "@iot-management/types";

export type LinkAlertIncidentDto = LinkAlertIncidentRequest;
```

Add controller methods with `@Roles("owner", "manager")`:

```ts
@Post(":alertId/incidents")
createIncident(@Req() request, @Param("alertId") alertId, @Body() dto) {
  return this.incidents.createFromAlert(request.context!, alertId, dto);
}

@Post(":alertId/link-incident")
linkIncident(@Req() request, @Param("alertId") alertId, @Body() dto) {
  return this.alertEvents.linkToIncident(request.context!, alertId, dto.incidentId);
}
```

Inject `LeakIncidentsService` into `AlertsController` and import `IncidentsModule` into `AlertsModule`. Add the two endpoint descriptions to the generated OpenAPI document.

Extend `LeakIncidentsService.get` with:

```ts
relatedAlerts: await this.alertEvents.list(context, { incidentId }),
```

Avoid an import cycle by having `LeakIncidentsService` use the persistence interface directly for `listAlertEvents`, then enrich only the API list endpoint in `AlertEventsService`.

- [ ] **Step 5: Run API regression coverage**

Run:

```bash
corepack pnpm --dir apps/api exec vitest run --config vitest.e2e.config.ts test/incidents.e2e-spec.ts
corepack pnpm --filter @iot-management/api test
corepack pnpm --filter @iot-management/api typecheck
```

Expected: PASS. Existing manual incident endpoints still work; alert and incident acknowledgement/resolution tests show independent statuses.

- [ ] **Step 6: Commit REST behavior**

```bash
git add apps/api/src/alerts apps/api/src/incidents apps/api/src/openapi/openapi.controller.ts apps/api/test/incidents.e2e-spec.ts
git commit -m "feat: link alerts to manual incidents"
```

### Task 4: Add Dashboard Correlation Workflows

**Files:**
- Modify: `apps/web-dashboard/features/alerts/alerts-table.tsx`
- Modify: `apps/web-dashboard/features/incidents/incident-detail.tsx`
- Modify: `apps/web-dashboard/tests/auth-fixture.ts`
- Modify: `apps/web-dashboard/tests/water-operations.spec.ts`

- [ ] **Step 1: Write failing Playwright scenarios**

Add tests that mock an unlinked alert, an active incident, buildings, units, and meters. Assert:

```ts
await expect(page.getByRole("button", { name: "Create incident" })).toBeVisible();
await page.getByRole("button", { name: "Link existing incident" }).click();
await page.getByLabel("Incident").selectOption(incident.id);
await page.getByRole("button", { name: "Link incident" }).click();
await expect(page.getByRole("link", { name: incident.title })).toBeVisible();
```

Run the same page as a viewer and assert both mutation buttons have count zero while the related incident link remains visible.

- [ ] **Step 2: Run the browser test to establish the red state**

Run:

```bash
corepack pnpm --filter @iot-management/web-dashboard test:e2e -- water-operations.spec.ts
```

Expected: FAIL because correlation controls and related-alert rendering do not exist.

- [ ] **Step 3: Implement Alerts table controls**

In `AlertsTable`:

1. Fetch `/incidents`, `/buildings`, `/units`, and `/meters` with the existing resource helpers when the create/link panel opens.
2. Add a Related incident table column. Render a normal application link to `/incidents/${alert.incident.id}` when the enriched summary exists; otherwise show `Unlinked`.
3. For an unlinked alert and `allowMutations`, show icon/text actions **Create incident** and **Link existing incident**.
4. Render one full-width inline correlation panel below the alert table. The create form has building, optional unit, optional meter, severity, title, and description inputs. Prefill title and description from the selected alert.
5. Submit create to `/alerts/${alert.id}/incidents`; replace the alert in state with `response.alert`, invalidate dashboard queries, then navigate to `/incidents/${response.incident.id}`.
6. The link form lists only non-resolved incidents and submits to `/alerts/${alert.id}/link-incident`; replace the alert in state and close the panel.
7. Render request failures as `<section className="state-panel error-state">` so errors span the page width.

Do not expose either action for viewers or for alerts that already have `incidentId`.

- [ ] **Step 4: Implement incident detail evidence panel**

Extend the typed detail query to consume `relatedAlerts`. Add a `Related alerts` data panel with an empty state and a compact table containing alert title, severity, status, triggered time, and link to `/alerts`. Do not add actions that alter alert lifecycle from the incident page.

- [ ] **Step 5: Extend request mocks and make the browser test green**

In `auth-fixture.ts`, add mutable route state for alert-to-incident endpoints and return enriched alert payloads. Extend the incident detail mock with `relatedAlerts`. Run:

```bash
corepack pnpm --filter @iot-management/web-dashboard test:e2e -- water-operations.spec.ts
```

Expected: PASS for owner, manager, and viewer correlation states.

- [ ] **Step 6: Run frontend regression checks**

Run:

```bash
corepack pnpm --filter @iot-management/web-dashboard lint
corepack pnpm --filter @iot-management/web-dashboard typecheck
corepack pnpm --filter @iot-management/web-dashboard test
corepack pnpm --filter @iot-management/web-dashboard build
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit dashboard correlation**

```bash
git add apps/web-dashboard/features/alerts/alerts-table.tsx apps/web-dashboard/features/incidents/incident-detail.tsx apps/web-dashboard/tests/auth-fixture.ts apps/web-dashboard/tests/water-operations.spec.ts
git commit -m "feat: manage incidents from alerts"
```

### Task 5: Add Operator Test Requests And Complete Regression Verification

**Files:**
- Modify: `http/30-alerts-reports-audit.http`
- Test: `apps/api/test/incidents.e2e-spec.ts`
- Test: `apps/web-dashboard/tests/water-operations.spec.ts`

- [ ] **Step 1: Add IntelliJ HTTP Client examples**

Add requests in this order:

```http
### Create incident from an alert
POST {{baseUrl}}/alerts/{{testAlertId}}/incidents
Authorization: Bearer {{ownerToken}}
Content-Type: application/json

{
  "buildingId": "{{testBuildingId}}",
  "severity": "warning",
  "title": "Investigate high water usage",
  "description": "Created deliberately from alert {{testAlertId}}."
}

### Link alert to existing active incident
POST {{baseUrl}}/alerts/{{testAlertId}}/link-incident
Authorization: Bearer {{ownerToken}}
Content-Type: application/json

{ "incidentId": "{{testIncidentId}}" }
```

Add a negative request using an alert or incident from the other seeded organization and assert the tenant-safe error response.

- [ ] **Step 2: Run focused backend and frontend suites**

Run:

```bash
corepack pnpm --dir apps/api exec vitest run --config vitest.e2e.config.ts test/incidents.e2e-spec.ts
corepack pnpm --filter @iot-management/web-dashboard test:e2e -- water-operations.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run full project verification**

Run:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @iot-management/api test:e2e
corepack pnpm --filter @iot-management/web-dashboard test:e2e
corepack pnpm --filter @iot-management/api db:migrate
```

Expected: all commands exit 0; migration `0018_alert_incident_links.sql` applies once and is safe to rerun.

- [ ] **Step 4: Perform manual verification**

1. Start PostgreSQL, migrate, seed, API, and web dashboard using `docs/deployment/local-product-test-runbook.md`.
2. Sign in at `http://127.0.0.1:3000/login` as `owner@north.example`.
3. Open `http://127.0.0.1:3000/alerts`, evaluate or seed an alert, and create an incident from it.
4. Confirm navigation opens `/incidents/<id>`, the detail page lists the initiating alert, and the Alerts table links back to the incident.
5. Link a second alert to the same active incident; confirm it appears in Related alerts.
6. Resolve the alert and verify the incident remains active; resolve the incident and verify the alert status is unchanged.
7. Sign in as `viewer@north.example` and verify links remain visible but Create incident and Link existing incident do not appear.
8. Use the cross-organization HTTP request and verify `404 TENANT_RESOURCE_NOT_FOUND`.

- [ ] **Step 5: Commit test requests and verification artifacts**

```bash
git add http/30-alerts-reports-audit.http apps/api/test/incidents.e2e-spec.ts apps/web-dashboard/tests/water-operations.spec.ts apps/web-dashboard/tests/auth-fixture.ts
git commit -m "test: cover alert incident correlation"
```
