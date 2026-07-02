# Dashboard Performance Implementation Plan

> **For agentic workers:** REQUIRED: Use `superpowers:subagent-driven-development` (if subagents are available) or `superpowers:executing-plans` to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the authenticated dashboard load through one read-optimized, tenant-safe endpoint instead of five independent API requests, while retaining the existing dashboard API endpoints for compatibility.

**Architecture:** Add an additive `GET /api/v1/dashboard/overview` endpoint that composes summary, trends, building usage, unit rankings, and device health for one organization and a defined time range. Move usage grouping and portfolio-name joins into PostgreSQL/Kysely queries, then consume the new endpoint through a TanStack Query hook with caching and background refresh.

**Tech Stack:** NestJS 11, PostgreSQL, Kysely, Next.js 16, React 19, TypeScript, TanStack Query v5, Vitest, Supertest, Playwright.

---

## Decisions Locked For This Plan

- Keep `/dashboard/summary`, `/dashboard/trends`, `/dashboard/buildings`, `/dashboard/units`, and `/dashboard/device-health` unchanged. They remain supported focused endpoints for API clients and future pages.
- Add `/dashboard/overview` as the dashboard landing-page endpoint.
- Default overview range: the previous 30 complete UTC calendar days, with `periodType=day`.
- Overview requests may filter by `from`, `to`, `buildingId`, and `utilityType`. The API derives the organization from the authenticated membership; it never accepts an organization ID from the browser.
- Return the highest-usage 10 unit-and-utility rows in the overview. Focused `/dashboard/units` behavior remains unchanged.
- Keep aggregate cost behavior compatible: stored costs win; missing costs use current organization utility rates through `CostEstimateService`.
- Add structured timing logs for every dashboard endpoint, including the five retained focused routes and the new overview route. Use stable endpoint names rather than raw URLs or query values.
- Do not introduce TimescaleDB, Redis caching, materialized views, or a dashboard redesign in this phase.

## Target Contract

Add these types in `packages/types/src/dashboard.ts`:

```ts
export interface DashboardOverviewRange {
  from: ISODateTime;
  to: ISODateTime;
  periodType: AggregatePeriodType;
}

export interface DashboardOverviewResponse {
  summary: DashboardSummaryResponse;
  trends: PageResponse<UsageTrendPoint>;
  buildings: PageResponse<BuildingBreakdownItem>;
  units: PageResponse<UnitRankingItem>;
  deviceHealth: DeviceHealthResponse;
  range: DashboardOverviewRange;
}
```

`GET /api/v1/dashboard/overview` accepts this validated query shape:

```ts
{
  from?: ISODateTime;
  to?: ISODateTime;
  buildingId?: EntityId;
  utilityType?: "water" | "electric";
}
```

Rules:

- Default `from` and `to` are calculated once at request start. The result is a half-open range: `period_start >= from AND period_start < to`.
- Explicit `from` and `to` must be valid ISO timestamps and `from < to`; invalid input returns the project-standard `400` API error.
- An optional `buildingId` must belong to the authenticated organization; otherwise return the project-standard `404` response.
- The response contains no alert-event list. `summary.openAlertCount` and `summary.criticalAlertCount` are sufficient for the current dashboard and avoid an unbounded payload.
- Add `dashboard.overview(query?)` to `packages/api-client/src/endpoints.ts`.

## File Responsibilities

- `apps/api/src/dashboard/dashboard.controller.ts` and `dashboard.service.ts`: validated overview route and composition of tenant-scoped read models.
- `apps/api/src/common/interceptors/dashboard-timing.interceptor.ts` (new): controller-level duration measurement and development `Server-Timing` header for every dashboard route.
- `apps/api/src/analytics/usage-query.service.ts`: dashboard-facing trend, building, and unit query orchestration; no per-aggregate portfolio lookups.
- `apps/api/src/persistence/persistence.service.ts`, `in-memory-persistence.service.ts`, and `postgres-persistence.service.ts`: grouped dashboard read methods, with PostgreSQL as the optimized implementation and in-memory support for focused unit tests.
- `apps/api/db/migrations/0010_dashboard_performance_indexes.sql`: additive query indexes only.
- `packages/types/src/dashboard.ts` and `packages/api-client/src/endpoints.ts`: public contract and typed client method.
- `apps/web-dashboard/app/layout.tsx` or a focused provider component: one `QueryClientProvider` for authenticated dashboard pages.
- `apps/web-dashboard/lib/dashboard-query.ts` (new): query key, request function, cache policy, and typed hook.
- `apps/web-dashboard/features/dashboard/dashboard-overview.tsx`: replace five resource calls with one overview query while retaining loading, empty, error, and stale states.
- `apps/web-dashboard/components/account-menu.tsx` and `lib/use-api-resource.ts`: share `/auth/me` through TanStack Query; leave non-dashboard resource consumers intact.

## Chunk 1: Contract And Database Read Model

### Task 1: Add failing shared-contract and API-client tests

**Files:**
- Modify: `packages/types/src/dashboard.ts`
- Modify: `packages/api-client/src/endpoints.ts`
- Modify or create: existing package tests for types/API client

- [ ] **Step 1: Write failing compile/test coverage**

Assert that `DashboardOverviewResponse` contains the five dashboard sections and a range, and that `api.dashboard.overview()` serializes optional query fields without an organization ID.

- [ ] **Step 2: Run the focused package tests/typechecks**

Run:

```bash
pnpm --filter @iot-management/types typecheck
pnpm --filter @iot-management/api-client typecheck
```

Expected: failure before the overview types and client method exist.

- [ ] **Step 3: Implement the public contract**

Add the interfaces above, export them from the existing barrel, and add `dashboard.overview(query?)` using the existing REST client conventions.

- [ ] **Step 4: Re-run focused checks**

Expected: both package typechecks pass.

### Task 2: Add a migration for dashboard-shaped indexes

**Files:**
- Create: `apps/api/db/migrations/0010_dashboard_performance_indexes.sql`
- Test: `apps/api/test/migrations.e2e-spec.ts`

- [ ] **Step 1: Write a failing migration test**

Verify that a fresh database migrates successfully and that the migration is idempotent through the established migration runner.

- [ ] **Step 2: Run the focused migration test**

Run:

```bash
pnpm --dir apps/api exec vitest run --config vitest.e2e.config.ts test/migrations.e2e-spec.ts
```

Expected: failure because the new migration does not exist.

- [ ] **Step 3: Add only additive indexes**

Create:

```sql
CREATE INDEX usage_aggregates_dashboard_window_idx
  ON usage_aggregates (organization_id, period_type, period_start)
  INCLUDE (period_end, utility_type, building_id, unit_id, usage_value, cost_estimate);

CREATE INDEX alert_events_dashboard_open_idx
  ON alert_events (organization_id, status);
```

Do not alter or rebuild existing aggregate data.

- [ ] **Step 4: Re-run migration test and inspect plan**

After migration and demo seed, run `EXPLAIN (ANALYZE, BUFFERS)` for the organization/day/range aggregate query. Record whether PostgreSQL uses the new index for the range scan; adjust only the index definition if the query shape cannot use it.

### Task 3: Add grouped persistence methods with red tests

**Files:**
- Modify: `apps/api/src/persistence/persistence.service.ts`
- Modify: `apps/api/src/persistence/in-memory-persistence.service.ts`
- Modify: `apps/api/src/persistence/postgres-persistence.service.ts`
- Test: `apps/api/src/analytics/analytics.service.spec.ts`
- Test: `apps/api/test/postgres-persistence.e2e-spec.ts`

- [ ] **Step 1: Write failing tests for the read model**

Cover these cases:

- Two meters for one organization, period, and utility return one trend point with summed usage.
- Building breakdown returns the joined building name and one row per building/utility.
- Unit rankings omit shared building meters without a `unitId`, join both names, sort descending, and limit only the overview path to ten rows.
- A second organization’s aggregate never appears in any result.
- A null aggregate cost contributes rate-derived cost for only its own usage amount.

- [ ] **Step 2: Run focused tests and confirm red state**

Run:

```bash
pnpm --filter @iot-management/api test -- src/analytics/analytics.service.spec.ts
pnpm --dir apps/api exec vitest run --config vitest.e2e.config.ts test/postgres-persistence.e2e-spec.ts
```

Expected: failure because the grouped persistence contract is absent.

- [ ] **Step 3: Add explicit grouped persistence methods**

Add typed methods for trend, building, and unit dashboard rows. They accept the authenticated organization scope, period type, half-open date range, and optional building/utility filters. Return internal grouped rows, including stored-cost usage and missing-cost usage where cost calculation needs both values.

Use PostgreSQL grouping and joins:

- Trends: group by `period_start`, `period_end`, and `utility_type`.
- Buildings: join `buildings` on both `id` and `organization_id`; group by building ID, building name, and utility type.
- Units: join `units` and `buildings` on IDs and organization ID; exclude null `unit_id`; group by unit/building IDs, names, and utility type.
- Apply `organization_id` before every join and aggregation.

Implement equivalent deterministic grouping in the in-memory service for unit tests. Do not make `UsageQueryService` query raw aggregates and then call `findBuildingById` or `findUnitById`.

- [ ] **Step 4: Run focused tests until green**

Expected: all grouped-read and tenant-isolation assertions pass.

- [ ] **Step 5: Commit checkpoint**

```bash
git add apps/api/db/migrations/0010_dashboard_performance_indexes.sql apps/api/src/persistence apps/api/src/analytics/analytics.service.spec.ts apps/api/test/migrations.e2e-spec.ts apps/api/test/postgres-persistence.e2e-spec.ts packages/types packages/api-client
git commit -m "Add optimized dashboard read model"
```

## Chunk 2: Overview Endpoint And Backward Compatibility

### Task 4: Refactor analytics reads without changing focused endpoint shapes

**Files:**
- Modify: `apps/api/src/analytics/usage-query.service.ts`
- Test: `apps/api/src/analytics/analytics.service.spec.ts`
- Test: `apps/api/test/dashboard.e2e-spec.ts`

- [ ] **Step 1: Add failing focused endpoint regression assertions**

Assert existing trends, buildings, and units responses retain their current public fields and aggregation semantics after the internal read-model change.

- [ ] **Step 2: Refactor `UsageQueryService`**

Make `getTrends`, `getBuildingBreakdown`, and `getUnitRankings` use the grouped persistence methods. Apply `CostEstimateService` only to the missing-cost portion. Preserve response field names, ordering rules, and the existing optional filters.

- [ ] **Step 3: Run unit and dashboard e2e regression tests**

Run:

```bash
pnpm --filter @iot-management/api test -- src/analytics/analytics.service.spec.ts
pnpm --dir apps/api exec vitest run --config vitest.e2e.config.ts test/dashboard.e2e-spec.ts
```

Expected: existing endpoints remain compatible, with no duplicate trend period/utility rows.

### Task 5: Add the overview endpoint with tenant-safe range handling and timing logs

**Files:**
- Modify: `apps/api/src/dashboard/dashboard.controller.ts`
- Modify: `apps/api/src/dashboard/dashboard.service.ts`
- Modify: existing query DTO or create `apps/api/src/dashboard/dto/dashboard-overview-query.dto.ts`
- Create: `apps/api/src/common/interceptors/dashboard-timing.interceptor.ts`
- Test: `apps/api/test/dashboard.e2e-spec.ts`
- Test: `apps/api/test/tenant-isolation-regression.e2e-spec.ts`
- Test: `apps/api/src/common/interceptors/dashboard-timing.interceptor.spec.ts`

- [ ] **Step 1: Write failing endpoint tests**

Cover:

- One `GET /api/v1/dashboard/overview` response has summary, trends, buildings, units, device health, and range.
- Defaults use `day` and the prior 30 complete UTC days.
- Explicit valid filters affect every usage section but do not affect organization boundaries.
- Invalid timestamp/range returns `400`.
- An organization cannot query another organization’s building.
- Viewer access remains read-only and can retrieve the overview.

- [ ] **Step 2: Implement the query DTO and controller route**

Use the project’s DTO validation pattern. Determine `now` once per request, normalize default bounds to UTC day boundaries, and use a half-open date interval. Validate `buildingId` against the authenticated organization before querying aggregates.

- [ ] **Step 3: Implement `DashboardService.overview()`**

Run independent reads concurrently with `Promise.all`: grouped trends, building breakdown, top-ten unit rankings, device health, and open alert counts. Build utility summaries from the same grouped trend result; do not issue a second trend query for summary generation.

Set `generatedAt` once in the response and retain existing device-health stale thresholds.

- [ ] **Step 4: Add controller-wide dashboard timing instrumentation**

Write failing interceptor tests first. Apply `DashboardTimingInterceptor` at `DashboardController` scope so it times all six routes: `summary`, `trends`, `buildings`, `units`, `device-health`, and `overview`.

For every completed request, log one `StructuredLogger.info("Dashboard endpoint timing", fields)` entry with only:

```ts
{
  endpoint: "dashboard.overview" | "dashboard.summary" | "dashboard.trends" |
    "dashboard.buildings" | "dashboard.units" | "dashboard.deviceHealth";
  method: "GET";
  statusCode: number;
  durationMs: number;
  requestId?: string;
  slow: boolean; // true when durationMs >= 1000
}
```

Use `process.hrtime.bigint()` or `performance.now()` for monotonic elapsed time. On a thrown handler error, log the measured duration and resulting HTTP status when available, then rethrow so the existing exception filter preserves its response contract. Do not log raw URLs, query parameters, filter values, email addresses, cookies, authorization headers, session data, or organization IDs.

In non-production environments only, append `Server-Timing: dashboard;dur=<milliseconds>` to every dashboard response. Do not expose this header in production.

- [ ] **Step 5: Add API documentation and development timing assertions**

Document the overview request and response in the existing OpenAPI setup. Add e2e assertions that every dashboard endpoint returns `Server-Timing` in development/test configuration, while interceptor unit tests assert one sanitized timing log per completion and error path.

- [ ] **Step 6: Run focused e2e tests**

Expected: overview contract, validation, and tenant isolation tests pass; current dashboard endpoint tests remain green.

- [ ] **Step 7: Commit checkpoint**

```bash
git add apps/api/src/dashboard apps/api/src/analytics/usage-query.service.ts apps/api/test/dashboard.e2e-spec.ts apps/api/test/tenant-isolation-regression.e2e-spec.ts
git commit -m "Add dashboard overview endpoint"
```

## Chunk 3: Cached Single-Request Dashboard

### Task 6: Establish TanStack Query for authenticated data

**Files:**
- Modify: `apps/web-dashboard/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web-dashboard/components/query-provider.tsx`
- Modify: `apps/web-dashboard/app/layout.tsx` or the existing root composition point
- Modify: `apps/web-dashboard/lib/use-api-resource.ts`
- Modify: `apps/web-dashboard/components/account-menu.tsx`
- Test: `apps/web-dashboard/app` or `lib` unit tests

- [ ] **Step 1: Add failing session-cache test**

Render two authenticated consumers and assert they result in one `/auth/me` request. Assert an unauthenticated response still redirects to `/login` through the existing account-menu behavior.

- [ ] **Step 2: Install and configure TanStack Query v5**

Add the React-compatible TanStack Query v5 package to the dashboard workspace. Create one browser `QueryClient` with retry-once behavior for GET requests and no automatic retry for mutations.

- [ ] **Step 3: Migrate only current-session fetching**

Implement `useCurrentSession()` with query key `['auth', 'me']`, a 5-minute stale time, and existing `apiFetch` credentials behavior. Update `AccountMenu` to use it. Keep generic `useApiResource` for unrelated pages in this phase.

- [ ] **Step 4: Run focused dashboard unit tests**

Run:

```bash
pnpm --filter @iot-management/web-dashboard test -- app
pnpm --filter @iot-management/web-dashboard typecheck
```

Expected: session consumers deduplicate requests and typecheck passes.

### Task 7: Replace five dashboard requests with the overview query

**Files:**
- Create: `apps/web-dashboard/lib/dashboard-query.ts`
- Modify: `apps/web-dashboard/features/dashboard/dashboard-overview.tsx`
- Modify: `apps/web-dashboard/tests/auth-fixture.ts`
- Modify: `apps/web-dashboard/tests/api-driven-pages.spec.ts`
- Modify: `apps/web-dashboard/tests/dashboard.spec.ts`

- [ ] **Step 1: Write failing dashboard request-count and state tests**

Assert `/dashboard`:

- requests `/api/v1/dashboard/overview` once;
- does not request the five legacy dashboard endpoints;
- renders the existing metric, trend, building, and unit data from one fixture;
- renders loading before first response;
- renders the error state when the first response fails;
- keeps last successful content visible and labels it stale when a background refresh fails.

- [ ] **Step 2: Implement `useDashboardOverview()`**

Use the key `['dashboard', 'overview', normalizedFilters]`. Fetch the new endpoint through `fetchJson`. Configure a 30-second stale time, 60-second refetch interval, one retry, and preserved data during refresh.

- [ ] **Step 3: Update `DashboardOverview`**

Replace the five `useApiResource` calls with the overview hook. Map the response sections directly into existing presentational components so visual layout and labels stay unchanged. Preserve empty-state behavior when utility summaries or trend items are empty.

- [ ] **Step 4: Update Playwright API fixtures**

Replace separate dashboard route handlers with one overview route handler. Keep legacy fixtures only where an unrelated test directly exercises a focused endpoint.

- [ ] **Step 5: Run focused UI tests and inspect the browser network panel**

Run:

```bash
pnpm --filter @iot-management/web-dashboard test
pnpm --filter @iot-management/web-dashboard test:e2e -- tests/dashboard.spec.ts tests/api-driven-pages.spec.ts
```

Expected: dashboard tests pass and the page has one dashboard-data request.

- [ ] **Step 6: Commit checkpoint**

```bash
git add apps/web-dashboard packages/api-client packages/types pnpm-lock.yaml
git commit -m "Load dashboard through cached overview query"
```

## Chunk 4: Full Verification And Manual Review

### Task 8: Run regression suite and document measured behavior

**Files:**
- Modify: `docs/deployment/local-product-test-runbook.md`

- [ ] **Step 1: Run backend verification**

```bash
pnpm --filter @iot-management/api test
pnpm --filter @iot-management/api typecheck
pnpm --filter @iot-management/api lint
pnpm --filter @iot-management/api build
pnpm --dir apps/api exec vitest run --config vitest.e2e.config.ts test/dashboard.e2e-spec.ts test/tenant-isolation-regression.e2e-spec.ts
```

- [ ] **Step 2: Run frontend verification**

```bash
pnpm --filter @iot-management/web-dashboard test
pnpm --filter @iot-management/web-dashboard typecheck
pnpm --filter @iot-management/web-dashboard lint
pnpm --filter @iot-management/web-dashboard build
pnpm --filter @iot-management/web-dashboard test:e2e
```

- [ ] **Step 3: Run monorepo and manifest checks**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local
```

- [ ] **Step 4: Add practical local performance verification to the runbook**

Document these steps:

1. Start PostgreSQL and Redis using the local Kubernetes instructions.
2. Run `pnpm db:migrate` and `pnpm seed:demo` with the documented local environment variables.
3. Start API on port `3001` and dashboard on port `3000`.
4. Sign in as `owner@north.example` and open `http://127.0.0.1:3000/dashboard`.
5. In browser DevTools Network, verify one `dashboard/overview` request and no requests to the five focused dashboard paths during initial dashboard render.
6. Verify water/electric summary cards, trend chart, building breakdown, unit rankings, and device-health counts.
7. Wait 60 seconds or reload; verify cached data remains visible while refresh occurs.
8. Run `curl -i` with an authenticated cookie against `/api/v1/dashboard/overview`; in development confirm the `Server-Timing` header is present and the payload contains all five dashboard sections.
9. Call each retained dashboard endpoint once and inspect API logs. Expect exactly one `Dashboard endpoint timing` JSON log per request with `endpoint`, `statusCode`, `durationMs`, `requestId`, and `slow`, without query values or sensitive data.

- [ ] **Step 5: Request code review before merge**

Use `superpowers:requesting-code-review` and resolve any confirmed issues. Verify the final diff contains only the additive overview path, query infrastructure, migration, tests, and documentation.

## Acceptance Criteria

- A dashboard navigation produces one dashboard-data HTTP request, not five.
- `/dashboard/overview` is tenant-isolated, validates filters, and returns all required sections in one response.
- Default results cover 30 complete days of daily aggregates.
- Aggregation and portfolio name lookup occur in PostgreSQL instead of application-level N+1 loops.
- Existing five dashboard endpoints retain their response shapes and pass regression tests.
- The UI supports loading, empty, initial error, and stale-refresh states.
- Every dashboard endpoint emits one sanitized structured timing log; non-production responses expose `Server-Timing`, while production responses do not.
- The database migration is additive and safe to re-run.
- Focused tests, typechecks, lint, builds, dashboard e2e, tenant-isolation e2e, and Kubernetes dry-run pass before merge.

## Manual Verification

This plan does not change runtime code yet. Review the completed implementation with the runbook steps in Task 8 after execution; expected outcome is a responsive dashboard with one overview request and persisted, tenant-scoped utility data.
