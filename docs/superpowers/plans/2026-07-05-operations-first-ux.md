# Operations First UX Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Overview page an operations-first, responsive, role-safe starting point with truthful metrics and a bounded priority queue, while retaining utility analytics below it.

**Architecture:** Add a tenant-scoped `GET /api/v1/dashboard/operations` read model that composes existing alerts, incidents, work orders, and calculated device health into counts plus a deterministic eight-item queue. The dashboard fetches this model independently of the existing analytics overview endpoint, so each section owns its loading/error/stale state. Rework the shell and dashboard components around the resulting hierarchy without adding mutations or a new persistence schema.

**Tech Stack:** NestJS 11 REST API, TypeScript, PostgreSQL persistence abstraction, Next.js 16, React 19, TanStack Query, existing CSS design system, Vitest, Playwright, Supertest.

---

## File Structure

### API and shared types

- Modify: `packages/types/src/dashboard.ts`
  - Add the operations response, queue item, queue kind, and assignment summary contract.
- Modify: `apps/api/src/dashboard/dashboard.service.ts`
  - Compose bounded organization-scoped source records and delegate pure classification/sorting.
- Create: `apps/api/src/dashboard/dashboard-operations.ts`
  - Pure classification, counts, precedence, deduplication, href/action mapping, and limit logic.
- Create: `apps/api/src/dashboard/dashboard-operations.spec.ts`
  - Unit tests for the pure read-model rules.
- Modify: `apps/api/src/dashboard/dashboard.controller.ts`
  - Add `GET /dashboard/operations` behind the existing authenticated controller.
- Modify: `apps/api/src/common/interceptors/dashboard-timing.interceptor.ts`
  - Give the endpoint a stable timing-log name.
- Modify: `apps/api/src/common/interceptors/dashboard-timing.interceptor.spec.ts`
  - Lock the timing name down without exposing query values.
- Modify: `apps/api/src/openapi/openapi.controller.ts`
  - Document the operations endpoint.
- Modify: `apps/api/test/dashboard.e2e-spec.ts`
  - Exercise the response shape and timing header through HTTP.
- Modify: `apps/api/test/tenant-isolation-regression.e2e-spec.ts`
  - Add the new route to the existing tenant-isolation regression list.

### Dashboard

- Modify: `apps/web-dashboard/lib/dashboard-query.ts`
  - Add a stable query key and `useDashboardOperations` hook.
- Modify: `apps/web-dashboard/app/dashboard-query.test.ts`
  - Cover the new query-key root and invalidation behavior.
- Create: `apps/web-dashboard/features/dashboard/operations-summary.tsx`
  - Render the four top-level metrics as semantic links, with accurate support labels.
- Create: `apps/web-dashboard/features/dashboard/operations-today.tsx`
  - Render loading, error, stale, empty, and ready queue states with direct destinations.
- Modify: `apps/web-dashboard/features/dashboard/overview-cards.tsx`
  - Reduce it to truthful water/electric usage-and-cost snapshot cards below operations; remove the hard-coded comparison text.
- Modify: `apps/web-dashboard/features/dashboard/dashboard-overview.tsx`
  - Fetch operations and analytics in parallel and render the two independently resilient sections in the approved order.
- Modify: `apps/web-dashboard/features/dashboard/usage-trend-chart.tsx`
  - Display the actual reporting range supplied by the overview response.
- Modify: `apps/web-dashboard/components/app-shell.tsx`
  - Remove global placeholder controls and expose an optional route-action slot for future functional controls.
- Modify: `apps/web-dashboard/lib/iconography.ts`
  - Replace old metric mappings with the Operations First labels; remove unused Search/Download topbar mappings.
- Modify: `apps/web-dashboard/app/iconography.test.ts`
  - Assert the revised icon registry and no longer expect generic topbar actions.
- Modify: `apps/web-dashboard/app/styles.css`
  - Add queue/metric layout rules, status/priority presentation, action wrapping, and target-width responsive hardening.
- Modify: `apps/web-dashboard/tests/auth-fixture.ts`
  - Mock the operations response used by dashboard browser tests.
- Modify: `apps/web-dashboard/tests/dashboard.spec.ts`
  - Add end-to-end metric, queue, navigation, absence-of-placeholder-controls, role, and responsive checks.
- Modify: `apps/web-dashboard/tests/operational-workflows.spec.ts`
  - Retain real report export coverage after shell control removal and add role-safe operation entry coverage if fixture ownership is clearer there.

## Chunk 1: Dashboard Operations API Contract

### Task 1: Define the shared read-model contract

**Files:**
- Modify: `packages/types/src/dashboard.ts`
- Test: `apps/api/src/dashboard/dashboard-operations.spec.ts`

- [ ] **Step 1: Write the failing type-level usage in the new operations unit test**

```ts
import type { DashboardOperationsResponse } from "@iot-management/types";

const result: DashboardOperationsResponse = buildDashboardOperations({
  alerts: [],
  deviceHealth: { meters: [] },
  incidents: [],
  now: "2026-07-05T12:00:00.000Z",
  organizationId: "org_north",
  workOrders: [],
});

expect(result).toMatchObject({
  criticalAlertCount: 0,
  incidentsWithoutRepairCount: 0,
  offlineMeterCount: 0,
  overdueWorkOrderCount: 0,
});
```

- [ ] **Step 2: Run the focused test to confirm the contract is absent**

Run: `pnpm --filter @iot-management/api test -- dashboard-operations.spec.ts`

Expected: FAIL because `DashboardOperationsResponse` and
`buildDashboardOperations` do not exist.

- [ ] **Step 3: Add explicit response types in `packages/types/src/dashboard.ts`**

Define these exported types, reusing `AlertSeverity`, `EntityId`,
`ISODateTime`, `MeterStatus`, `WorkOrderPriority`, and `WorkOrderStatus` from
`domain.ts`:

```ts
export const dashboardOperationKinds = [
  "alert",
  "incident",
  "meter",
  "work_order",
] as const;

export type DashboardOperationKind =
  (typeof dashboardOperationKinds)[number];

export interface DashboardOperationItem {
  actionLabel: string;
  assignmentType?: "internal" | "unassigned" | "vendor";
  detectedAt?: ISODateTime;
  dueAt?: ISODateTime;
  href: string;
  id: EntityId;
  isOverdue?: boolean;
  kind: DashboardOperationKind;
  priority?: WorkOrderPriority;
  severity?: AlertSeverity;
  status: string;
  supportingText?: string;
  title: string;
}

export interface DashboardOperationsResponse {
  criticalAlertCount: number;
  generatedAt: ISODateTime;
  incidentsWithoutRepairCount: number;
  items: DashboardOperationItem[];
  offlineMeterCount: number;
  organizationId: EntityId;
  overdueWorkOrderCount: number;
}
```

Keep the existing `DashboardOverviewResponse` unchanged; this is an additive
contract, not a replacement.

- [ ] **Step 4: Run the focused test and TypeScript check**

Run:

```bash
pnpm --filter @iot-management/types build
pnpm --filter @iot-management/api test -- dashboard-operations.spec.ts
```

Expected: type package builds; test advances only to the missing implementation
failure.

- [ ] **Step 5: Commit the contract checkpoint**

```bash
git add packages/types/src/dashboard.ts apps/api/src/dashboard/dashboard-operations.spec.ts
git commit -m "feat: define dashboard operations contract"
```

### Task 2: Implement and test pure operational classification

**Files:**
- Create: `apps/api/src/dashboard/dashboard-operations.ts`
- Create: `apps/api/src/dashboard/dashboard-operations.spec.ts`

- [ ] **Step 1: Write failing behavior tests for counts, deduplication, and order**

Use `InMemoryPersistenceService` domain-shaped records or direct typed fixtures.
Cover one fixture containing:

- an overdue `critical` work order for `incident_repair`;
- a `critical` active incident with no active work order;
- an active incident with an `assigned` work order, which must not increase
  `incidentsWithoutRepairCount`;
- an open critical alert linked to `incident_repair`, which counts as critical
  but must not appear in queue items;
- an open, unlinked warning alert;
- one offline meter and one stale meter.

Assert:

```ts
expect(result).toMatchObject({
  criticalAlertCount: 1,
  incidentsWithoutRepairCount: 1,
  offlineMeterCount: 1,
  overdueWorkOrderCount: 1,
});
expect(result.items.map((item) => item.kind)).toEqual([
  "work_order",
  "incident",
  "alert",
  "meter",
]);
expect(result.items[0]).toMatchObject({
  actionLabel: "Review repair",
  href: "/work-orders/work_order_overdue",
  isOverdue: true,
});
```

Add a second test with more than eight eligible records and assert the result
is exactly eight entries in deterministic order. Add a third test proving a
resolved incident and a completed/cancelled work order are excluded.

- [ ] **Step 2: Run the focused unit test to confirm it fails**

Run: `pnpm --filter @iot-management/api test -- dashboard-operations.spec.ts`

Expected: FAIL because the pure builder does not exist.

- [ ] **Step 3: Implement the pure builder**

In `dashboard-operations.ts`, export:

```ts
export function buildDashboardOperations(input: {
  alerts: AlertEvent[];
  deviceHealth: DeviceHealthResponse;
  incidents: LeakIncident[];
  now: string;
  organizationId: string;
  workOrders: WorkOrder[];
}): DashboardOperationsResponse;
```

Implementation rules:

1. Treat `open`, `assigned`, and `in_progress` as active work-order states.
2. Treat every incident except `resolved` as active.
3. Identify active-work-order incident IDs before deriving incidents without
   repair.
4. Calculate overdue only for `assigned` or `in_progress` records with a valid
   `dueAt` earlier than `now`.
5. Count all open critical alerts, even when linked; only queue open alerts
   without `incidentId`.
6. Map to stable hrefs/actions exactly as the design states. Never embed an
   organization ID in a href.
7. Sort using an explicit tuple, not locale-formatted strings: overdue work,
   critical work, unrepaired critical incidents, unrepaired other incidents,
   unlinked critical/warning/info alerts, then offline meters. Use oldest
   relevant timestamp as the final deterministic tie breaker and `id` as the
   last tie breaker.
8. Return `items.slice(0, 8)`.

Keep mapping and sorting helpers private except for the top-level builder.

- [ ] **Step 4: Run the focused unit test to confirm it passes**

Run: `pnpm --filter @iot-management/api test -- dashboard-operations.spec.ts`

Expected: PASS with all count, exclusion, ordering, and cap tests green.

- [ ] **Step 5: Run API formatting/lint for changed source**

Run: `pnpm --filter @iot-management/api lint`

Expected: exit code 0.

- [ ] **Step 6: Commit the pure read-model checkpoint**

```bash
git add apps/api/src/dashboard/dashboard-operations.ts apps/api/src/dashboard/dashboard-operations.spec.ts
git commit -m "feat: build dashboard operations queue"
```

### Task 3: Expose the authenticated operations endpoint

**Files:**
- Modify: `apps/api/src/dashboard/dashboard.service.ts`
- Modify: `apps/api/src/dashboard/dashboard.controller.ts`
- Modify: `apps/api/src/common/interceptors/dashboard-timing.interceptor.ts`
- Modify: `apps/api/src/common/interceptors/dashboard-timing.interceptor.spec.ts`
- Modify: `apps/api/src/openapi/openapi.controller.ts`
- Test: `apps/api/test/dashboard.e2e-spec.ts`
- Test: `apps/api/test/tenant-isolation-regression.e2e-spec.ts`

- [ ] **Step 1: Add failing HTTP tests**

Extend `dashboard.e2e-spec.ts` to create an organization-scoped incident,
assigned overdue work order, offline meter, and open alert using existing HTTP
workflows. Call:

```ts
await request(app.getHttpServer())
  .get("/api/v1/dashboard/operations")
  .set("Authorization", `Bearer ${ownerToken}`)
  .expect(200)
  .expect("Server-Timing", /dashboard;dur=/)
  .expect(({ body }) => {
    expect(body.organizationId).toBe("org_north");
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0]).toMatchObject({ kind: "work_order" });
  });
```

Update the table-driven `tenant-isolation-regression.e2e-spec.ts` route list
with `{ method: "get", path: "/api/v1/dashboard/operations" }`. The expected
cross-tenant result remains no data or a tenant-scoped result, never another
organization's record.

- [ ] **Step 2: Run the e2e tests to confirm the route is absent**

Run:

```bash
pnpm --filter @iot-management/api test:e2e -- dashboard.e2e-spec.ts
pnpm --filter @iot-management/api test:e2e -- tenant-isolation-regression.e2e-spec.ts
```

Expected: the new endpoint assertion fails with 404; existing test behavior is
otherwise unchanged.

- [ ] **Step 3: Compose data in `DashboardService.operations`**

Add an async `operations(organizationId: string)` method. In one `Promise.all`,
load:

```ts
this.alertEvents.list(organizationContext, {}),
this.persistence.listLeakIncidents({ organizationId }),
this.persistence.listWorkOrders({ organizationId }),
this.usageQuery.getDeviceHealth({ organizationId }),
```

Pass only their organization-scoped results plus `new Date().toISOString()` to
`buildDashboardOperations`. Do not inject `WorkOrdersService`; this preserves
the dashboard module boundary and keeps the calculation pure.

Add `@Get("operations")` before dynamic/ambiguous route declarations in the
controller and forward `request.context!.organization.id` only.

- [ ] **Step 4: Add timing and OpenAPI documentation**

Map `/dashboard/operations` to `dashboard.operations` in
`dashboardEndpointName`. Extend its existing unit test to assert that name.
Add an OpenAPI path entry with summary: “Return prioritized operational counts
and follow-up queue for the current organization.”

- [ ] **Step 5: Run focused tests to confirm they pass**

Run:

```bash
pnpm --filter @iot-management/api test -- dashboard-operations.spec.ts dashboard-timing.interceptor.spec.ts
pnpm --filter @iot-management/api test:e2e -- dashboard.e2e-spec.ts tenant-isolation-regression.e2e-spec.ts
```

Expected: all selected tests pass, including the timing header and tenant
isolation checks.

- [ ] **Step 6: Commit the endpoint checkpoint**

```bash
git add apps/api/src/dashboard apps/api/src/common/interceptors/dashboard-timing.interceptor.ts apps/api/src/common/interceptors/dashboard-timing.interceptor.spec.ts apps/api/src/openapi/openapi.controller.ts apps/api/test/dashboard.e2e-spec.ts apps/api/test/tenant-isolation-regression.e2e-spec.ts
git commit -m "feat: expose dashboard operations endpoint"
```

## Chunk 2: Operations-First Dashboard

### Task 4: Add operations query and browser fixtures

**Files:**
- Modify: `apps/web-dashboard/lib/dashboard-query.ts`
- Modify: `apps/web-dashboard/app/dashboard-query.test.ts`
- Modify: `apps/web-dashboard/tests/auth-fixture.ts`

- [ ] **Step 1: Add failing query-key tests**

Add expectations for:

```ts
expect(dashboardOperationsQueryKey).toEqual(["dashboard", "operations"]);
expect(dashboardOperationsQueryRootKey).toEqual(["dashboard", "operations"]);
```

Also assert the existing overview invalidator still does not accidentally
invalidate unrelated data.

- [ ] **Step 2: Run the focused test to confirm it fails**

Run: `pnpm --filter @iot-management/web-dashboard test -- app/dashboard-query.test.ts`

Expected: FAIL because operations query exports are absent.

- [ ] **Step 3: Implement the hook and stable query keys**

In `dashboard-query.ts`, import `DashboardOperationsResponse` and add:

```ts
export const dashboardOperationsQueryRootKey = [
  "dashboard",
  "operations",
] as const;

export const dashboardOperationsQueryKey = dashboardOperationsQueryRootKey;

export function useDashboardOperations() {
  return useQuery({
    queryFn: () =>
      fetchJson<DashboardOperationsResponse>("/dashboard/operations"),
    queryKey: dashboardOperationsQueryKey,
    refetchInterval: 60_000,
    retry: 1,
    staleTime: 30_000,
  });
}
```

Keep overview and operations keys separate so a mutation can invalidate only
the affected dashboard data in a later change.

- [ ] **Step 4: Add one realistic operations mock**

In `auth-fixture.ts`, register `**/api/v1/dashboard/operations` before the
catch-all dashboard routes. Return all four non-zero counts and four ordered
items: overdue work order, unrepaired incident, unlinked alert, and offline
meter. Use hrefs that exist in the fixture's current route data.

- [ ] **Step 5: Run the focused test to confirm it passes**

Run: `pnpm --filter @iot-management/web-dashboard test -- app/dashboard-query.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the dashboard data-access checkpoint**

```bash
git add apps/web-dashboard/lib/dashboard-query.ts apps/web-dashboard/app/dashboard-query.test.ts apps/web-dashboard/tests/auth-fixture.ts
git commit -m "feat: query dashboard operations"
```

### Task 5: Build the metric strip and Operations Today queue

**Files:**
- Create: `apps/web-dashboard/features/dashboard/operations-summary.tsx`
- Create: `apps/web-dashboard/features/dashboard/operations-today.tsx`
- Modify: `apps/web-dashboard/features/dashboard/dashboard-overview.tsx`
- Modify: `apps/web-dashboard/app/styles.css`
- Test: `apps/web-dashboard/tests/dashboard.spec.ts`

- [ ] **Step 1: Add failing browser tests for the approved hierarchy**

In `dashboard.spec.ts`, after `mockAuthenticatedSession(page)` and
`page.goto("/dashboard")`, assert:

```ts
await expect(page.getByRole("heading", { name: "Critical alerts" })).toBeVisible();
await expect(page.getByRole("heading", { name: "Incidents without repair" })).toBeVisible();
await expect(page.getByRole("heading", { name: "Overdue work" })).toBeVisible();
await expect(page.getByRole("heading", { name: "Devices offline" })).toBeVisible();
await expect(page.getByRole("heading", { name: "Operations Today" })).toBeVisible();
await expect(page.getByRole("link", { name: "Review repair" })).toHaveAttribute(
  "href",
  "/work-orders/work_order_overdue",
);
```

Assert `Search` and `Export` buttons are absent from the top bar. Add route
click checks for each queue item; use `page.goto` between checks when a target
page is the clearest behavior assertion.

- [ ] **Step 2: Run the new dashboard browser test to confirm it fails**

Run: `pnpm --filter @iot-management/web-dashboard test:e2e -- dashboard.spec.ts`

Expected: FAIL because operations elements and links are absent.

- [ ] **Step 3: Create `OperationsSummary`**

Render a `<section aria-label="Operational summary" className="operations-metric-strip">`
with four `<a>` metric cards. Use the response values and these support labels:

| Metric | Support text when zero | Support text when non-zero |
| --- | --- | --- |
| Critical alerts | `No critical alerts` | `Respond now` |
| Incidents without repair | `No incidents need repair` | `Needs repair planning` |
| Overdue work | `No overdue repairs` | `Vendor or team follow-up` |
| Devices offline | `All devices reporting` | `Inspect meter connectivity` |

Use existing Lucide registry patterns for `TriangleAlert`, `Droplets`,
`ListOrdered`, and `Gauge`; do not draw icons with CSS pseudo-elements. Every
card must have a visible label and a link destination, not a button that
pretends to mutate data.

- [ ] **Step 4: Create `OperationsToday`**

Render independent loading/error/stale/empty/ready states from the operations
query. In ready state, use a data panel with a table on desktop and permitted
panel-local horizontal scroll on narrow screens. Columns: `Priority work`,
`Status`, `Assignment`, `When`, and `Next action`.

Use an item kind/priority/severity/overdue text badge. Show `-` for fields not
meaningful to an alert or meter. Use the API-provided `href` and `actionLabel`;
do not reconstruct routing rules in the browser.

- [ ] **Step 5: Refactor `DashboardOverview` around independent sections**

Call `useDashboardOverview()` and `useDashboardOperations()` at the top level.
Render operations summary and queue first. Render the existing analytics
panels only when overview data is available. Preserve current test-only
`?state=loading|error|empty` behavior by applying it to the relevant section
state rather than making both requests disappear in production.

An operations error displays a local `Operations data is unavailable` panel;
successful analytics remain visible. An analytics error retains the existing
dashboard error state beneath any successful operations section.

- [ ] **Step 6: Add responsive CSS with stable dimensions**

Add these new classes in `styles.css` near existing metric/table rules:

```css
.operations-metric-strip { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.operations-queue { grid-column: 1 / -1; }
.operations-queue table { min-width: 720px; }
@media (max-width: 1100px) { .operations-metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .operations-metric-strip { grid-template-columns: 1fr; } }
```

Use the existing border/padding/color variables. Ensure `min-width: 0` on grid
children, one intentional `overflow-x: auto` container around tables, and no
fixed action-column width. Do not add decorative gradients or new visual
themes.

- [ ] **Step 7: Run focused browser tests to confirm they pass**

Run: `pnpm --filter @iot-management/web-dashboard test:e2e -- dashboard.spec.ts`

Expected: dashboard metrics, queue action links, and absence of generic topbar
controls pass in Chromium.

- [ ] **Step 8: Commit the operations-first screen checkpoint**

```bash
git add apps/web-dashboard/features/dashboard/operations-summary.tsx apps/web-dashboard/features/dashboard/operations-today.tsx apps/web-dashboard/features/dashboard/dashboard-overview.tsx apps/web-dashboard/app/styles.css apps/web-dashboard/tests/dashboard.spec.ts
git commit -m "feat: make dashboard operations first"
```

### Task 6: Make usage analytics truthful and shell controls route-specific

**Files:**
- Modify: `apps/web-dashboard/features/dashboard/overview-cards.tsx`
- Modify: `apps/web-dashboard/features/dashboard/usage-trend-chart.tsx`
- Modify: `apps/web-dashboard/components/app-shell.tsx`
- Modify: `apps/web-dashboard/lib/iconography.ts`
- Modify: `apps/web-dashboard/app/iconography.test.ts`
- Modify: `apps/web-dashboard/app/usage-trend-chart.test.ts`
- Modify: `apps/web-dashboard/tests/dashboard.spec.ts`

- [ ] **Step 1: Add failing unit/source tests for accurate labels**

Update `iconography.test.ts` to expect only Operations First metric mappings
and no `topbarActionIconNames` export. Add a test that confirms no literal
`+8.4% vs last month` remains in `overview-cards.tsx`.

Add pure tests for a new exported `formatDashboardRangeLabel(range)` helper:

```ts
expect(formatDashboardRangeLabel({
  from: "2026-06-01T00:00:00.000Z",
  periodType: "day",
  to: "2026-07-01T00:00:00.000Z",
})).toBe("Last 30 days");
```

- [ ] **Step 2: Run the relevant tests to confirm they fail**

Run:

```bash
pnpm --filter @iot-management/web-dashboard test -- app/iconography.test.ts app/usage-trend-chart.test.ts
```

Expected: FAIL against the current hard-coded change text and icon mapping.

- [ ] **Step 3: Rework usage summary cards**

Keep the file name to minimize churn, but make `OverviewCards` render only
Water Usage and Electric Usage below `OperationsToday`. Accept the overview
range as a prop. For each utility:

- show usage with unit;
- show estimated cost when present;
- show `comparisonPercent` only if it is a finite API value, using an explicit
  neutral/positive/negative label;
- otherwise show `Last N days` using the range helper.

Do not display device health, alert, or work-order counts a second time.

- [ ] **Step 4: Update the trend chart period label**

Pass `overview.range` to `UsageTrendChart`, preserve period-key deduplication,
and replace generic period caption text with the same range helper. Keep SVG
line output unchanged in this scope; the change is data truthfulness and label
clarity, not a chart-library rewrite.

- [ ] **Step 5: Remove global placeholders from `AppShell`**

Change the component props to:

```ts
export function AppShell({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
})
```

Render the actions container only when `actions` is provided. Remove Search and
Export imports, topbar mappings, and unused icons. Do not move report download
links into the global topbar; leave their existing functional panel intact.

- [ ] **Step 6: Run focused dashboard tests**

Run:

```bash
pnpm --filter @iot-management/web-dashboard test -- app/iconography.test.ts app/usage-trend-chart.test.ts
pnpm --filter @iot-management/web-dashboard test:e2e -- dashboard.spec.ts reports.spec.ts
```

Expected: no fake comparison label, actual range label visible, no global
placeholder controls, and report download links still visible.

- [ ] **Step 7: Commit the truthful analytics and shell checkpoint**

```bash
git add apps/web-dashboard/features/dashboard/overview-cards.tsx apps/web-dashboard/features/dashboard/usage-trend-chart.tsx apps/web-dashboard/components/app-shell.tsx apps/web-dashboard/lib/iconography.ts apps/web-dashboard/app/iconography.test.ts apps/web-dashboard/app/usage-trend-chart.test.ts apps/web-dashboard/tests/dashboard.spec.ts
git commit -m "fix: clarify dashboard metrics and controls"
```

## Chunk 3: Responsive And Regression Quality

### Task 7: Harden responsive operations layouts and action feedback

**Files:**
- Modify: `apps/web-dashboard/features/alerts/alerts-table.tsx`
- Modify: `apps/web-dashboard/features/incidents/incidents-panel.tsx`
- Modify: `apps/web-dashboard/features/work-orders/work-orders-panel.tsx`
- Modify: `apps/web-dashboard/app/styles.css`
- Modify: `apps/web-dashboard/tests/dashboard.spec.ts`
- Modify: `apps/web-dashboard/tests/operational-workflows.spec.ts`

- [ ] **Step 1: Add failing browser checks for compact operational surfaces**

Add viewport tests at 1440x900, 1024x900, and 390x844. At each width:

```ts
expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
  await page.evaluate(() => window.innerWidth),
);
```

For table-heavy routes, assert the table remains within a `.data-panel` whose
scroll container has `overflow-x: auto`; do not assert that the table itself
shrinks below its readable minimum width.

Add explicit assertions that at 1024px the sidebar is hidden and mobile
navigation trigger visible; at 390px the trigger opens and closes its drawer.
On alerts and work orders, assert multi-action groups are visible and their
buttons have non-zero, non-overlapping bounding boxes.

- [ ] **Step 2: Run the focused browser tests to confirm failures**

Run:

```bash
pnpm --filter @iot-management/web-dashboard test:e2e -- dashboard.spec.ts operational-workflows.spec.ts
```

Expected: at least new responsive/action assertions fail before CSS/markup
hardening.

- [ ] **Step 3: Add shared semantic badge markup in touched operational tables**

Use the existing `status-pill` baseline with additional explicit classes for
severity, priority, lifecycle, and overdue state. In the incident, alert, and
work-order tables, replace plain severity/priority/status text only where it
improves scanning. Do not change API values or lifecycle actions.

Use text labels inside every badge, including `Overdue`, and maintain the
existing viewer read-only behavior.

- [ ] **Step 4: Make action and feedback regions grid-safe**

Update markup and CSS so action cells use a wrapping container with `min-width:
0`; button grids use fluid `minmax(0, max-content)` tracks on desktop and one
column below 700px. Place form errors/success messages in dedicated full-width
feedback regions rather than adjacent to action buttons.

Retain the existing `data-panel` table scroll boundary. Ensure long vendor
names, work-order titles, and alert descriptions wrap with `overflow-wrap:
anywhere` without expanding the body width.

- [ ] **Step 5: Run focused browser tests to confirm they pass**

Run:

```bash
pnpm --filter @iot-management/web-dashboard test:e2e -- dashboard.spec.ts operational-workflows.spec.ts
pnpm --filter @iot-management/web-dashboard test:e2e -- alerts.spec.ts reports.spec.ts
```

Expected: all target viewport and route action checks pass; report export
coverage remains green.

- [ ] **Step 6: Commit responsive hardening**

```bash
git add apps/web-dashboard/features/alerts/alerts-table.tsx apps/web-dashboard/features/incidents/incidents-panel.tsx apps/web-dashboard/features/work-orders/work-orders-panel.tsx apps/web-dashboard/app/styles.css apps/web-dashboard/tests/dashboard.spec.ts apps/web-dashboard/tests/operational-workflows.spec.ts
git commit -m "fix: harden responsive operations layouts"
```

### Task 8: Run the complete verification suite and perform manual checks

**Files:**
- Modify only if verification exposes a scoped defect.

- [ ] **Step 1: Run API verification**

Run:

```bash
pnpm --filter @iot-management/types build
pnpm --filter @iot-management/api lint
pnpm --filter @iot-management/api typecheck
pnpm --filter @iot-management/api test
pnpm --filter @iot-management/api build
pnpm --filter @iot-management/api test:e2e
```

Expected: all commands exit 0. Investigate any failure before proceeding;
do not mark it transient without an immediate successful rerun and explanation.

- [ ] **Step 2: Run dashboard verification**

Run:

```bash
pnpm --filter @iot-management/web-dashboard lint
pnpm --filter @iot-management/web-dashboard typecheck
pnpm --filter @iot-management/web-dashboard test
pnpm --filter @iot-management/web-dashboard build
pnpm --filter @iot-management/web-dashboard test:e2e
```

Expected: all commands exit 0.

- [ ] **Step 3: Run repository and deployment checks**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local
```

Expected: all commands exit 0; Kubernetes accepts the existing manifests
unchanged.

- [ ] **Step 4: Perform manual verification with seeded local data**

1. Start local dependencies and API using the project’s local runbook, then
   open `http://localhost:3000/login`.
2. Sign in as `owner@north.example` with the demo password.
3. Open `/dashboard`. Confirm the first row is Critical alerts, Incidents
   without repair, Overdue work, and Devices offline; confirm no global Search
   or Export control is shown.
4. In Operations Today, use every visible action link and confirm it opens the
   matching existing alert, incident, work-order, or meter page.
5. Create or seed an incident without a work order; verify the count increments.
   Create an assigned work order for that incident; verify it leaves that count.
6. Create an assigned work order with a due date in the past; verify it appears
   first in the queue with `Overdue` and opens its detail page.
7. Sign in as a viewer and confirm the same dashboard data is visible while
   mutation controls remain unavailable on detail pages.
8. Resize the browser to 1024px and 390px. Confirm drawer navigation works,
   metric cards become 2x2 then one-column, and tables scroll inside panels
   rather than widening the page.
9. Open `/reports`; confirm the three real report downloads remain available.

- [ ] **Step 5: Review final changes before merge**

Run:

```bash
git status --short
git diff main...HEAD --check
git log --oneline main..HEAD
```

Expected: only Operations First UX files are changed; no local credentials,
generated assets, or unrelated user files are included.

- [ ] **Step 6: Request implementation review and commit any scoped fixes**

Use `superpowers:requesting-code-review` with the spec, this plan, final diff,
and verification evidence. Address validated findings with focused tests, then
create the final implementation commit only after the full suite remains green.
