# Leak Analytics And Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tenant-scoped leak response analytics, downloadable leak reports, and explainable opt-in baseline detection after fourteen valid days of water interval data.

**Architecture:** The new `LeakAnalyticsService` derives read models from existing immutable incidents, evidence, and readings; it does not persist report snapshots. `LeakReportsService` turns the analytics response into JSON, CSV, and a simple standards-compliant PDF. A persisted per-organization baseline setting enables a deterministic detector which evaluates hourly water usage only when the meter has at least fourteen distinct valid reading days.

**Tech Stack:** NestJS 11, TypeScript, Kysely/PostgreSQL, Vitest, existing Next.js 16 dashboard/API client, no new runtime dependency.

---

### Task 1: Contracts And Persistence

**Files:**
- Modify: `packages/types/src/api.ts`
- Modify: `apps/api/src/database/schema.ts`
- Modify: `apps/api/src/persistence/persistence.service.ts`
- Modify: `apps/api/src/persistence/in-memory-persistence.service.ts`
- Modify: `apps/api/src/persistence/postgres-persistence.service.ts`
- Create: `apps/api/db/migrations/0017_phase7_leak_baseline_settings.sql`
- Test: `packages/types/src/index.test.ts`

- [x] **Step 1: Write failing shared-contract tests**

```ts
expect(reportFormats).toEqual(["csv", "pdf", "json"]);
expect(leakAnalyticsPeriods).toEqual(["7d", "30d", "90d"]);
```

- [x] **Step 2: Run the type-package test**

Run: `pnpm --filter @iot-management/types test -- index.test.ts`
Expected: FAIL because the leak analytics exports do not exist.

- [x] **Step 3: Add API types and tenant-scoped baseline settings persistence**

```ts
export interface LeakBaselineSettings {
  organizationId: EntityId;
  enabled: boolean;
  minimumValidDays: number;
  thresholdMultiplier: number;
  updatedAt: ISODateTime;
}

export interface LeakAnalyticsQuery {
  from?: ISODateTime;
  to?: ISODateTime;
  buildingId?: EntityId;
}
```

The migration creates `leak_baseline_settings` keyed by `organization_id`, defaults `enabled` to false, `minimum_valid_days` to 14, and `threshold_multiplier` to 2. The persistence interface exposes get/update methods and both persistence implementations return an organization-specific default when no row exists.

- [x] **Step 4: Run contract and API type checks**

Run: `pnpm --filter @iot-management/types test -- index.test.ts && pnpm --filter @iot-management/api typecheck`
Expected: PASS.

### Task 2: Incident Analytics Read Model

**Files:**
- Create: `apps/api/src/incidents/leak-analytics.service.ts`
- Create: `apps/api/src/incidents/leak-analytics.service.spec.ts`
- Modify: `apps/api/src/incidents/incidents.controller.ts`
- Modify: `apps/api/src/incidents/incidents.module.ts`
- Modify: `packages/types/src/api.ts`

- [x] **Step 1: Write failing analytics service tests**

```ts
it("calculates response time, excess water, recurring locations, and outcomes", async () => {
  const report = await service.summary("org_north", { from, to });
  expect(report.responseTime.acknowledged.count).toBe(2);
  expect(report.recurringLocations[0]).toMatchObject({ buildingId, incidentCount: 2 });
  expect(report.excessWater.gallons).toBeCloseTo(12.5);
  expect(report.resolutionOutcomes.leak_fixed).toBe(1);
});
```

- [x] **Step 2: Run the focused test**

Run: `pnpm --filter @iot-management/api test -- src/incidents/leak-analytics.service.spec.ts`
Expected: FAIL because `LeakAnalyticsService` is absent.

- [x] **Step 3: Implement the read model and protected endpoint**

```ts
@Get("analytics")
analytics(@Req() request: RequestWithContext, @Query() query: LeakAnalyticsQuery) {
  return this.analyticsService.summary(request.context!.organizationId, query);
}
```

Calculate phase duration only where both timestamps exist. Group recurrence by building and unit, sorting by incident count then name. Sum only positive `estimatedExcessWater` and `estimatedExcessCost`. Restrict result records to the authenticated organization and apply optional date/building filters before grouping.

- [x] **Step 4: Run focused tests and controller type check**

Run: `pnpm --filter @iot-management/api test -- src/incidents/leak-analytics.service.spec.ts && pnpm --filter @iot-management/api typecheck`
Expected: PASS.

### Task 3: Leak Report Formats

**Files:**
- Create: `apps/api/src/reports/leak-reports.service.ts`
- Create: `apps/api/src/reports/leak-reports.service.spec.ts`
- Modify: `apps/api/src/reports/reports.controller.ts`
- Modify: `apps/api/src/reports/reports.module.ts`
- Modify: `packages/types/src/api.ts`
- Modify: `http/30-alerts-reports-audit.http`

- [x] **Step 1: Write failing format tests**

```ts
expect(await service.csv("org_north", {})).toContain("Acknowledgement median (minutes)");
expect((await service.pdf("org_north", {})).subarray(0, 5).toString()).toBe("%PDF-");
```

- [x] **Step 2: Run the focused report test**

Run: `pnpm --filter @iot-management/api test -- src/reports/leak-reports.service.spec.ts`
Expected: FAIL because the leak report service is absent.

- [x] **Step 3: Implement JSON, CSV, and PDF delivery**

```ts
@Get("leak-response")
json(@Req() request: RequestWithContext, @Query() query: LeakAnalyticsQuery) {
  return this.leakReportsService.json(request.context!.organizationId, query);
}

@Get("leak-response/export")
export(@Req() request: RequestWithContext, @Query() query: LeakReportExportQuery, @Res() response: Response) {
  return this.leakReportsService.writeExport(response, request.context!.organizationId, query);
}
```

`format=json` returns the structured report. `format=csv` returns a UTF-8 attachment. `format=pdf` returns a compact PDF with title, period, response time, excess water/cost, outcome rows, and recurring-location rows. Each export writes an audit event with report format and filters.

- [x] **Step 4: Run focused report tests**

Run: `pnpm --filter @iot-management/api test -- src/reports/leak-reports.service.spec.ts`
Expected: PASS.

### Task 4: Opt-In Fourteen-Day Baseline Detection

**Files:**
- Create: `apps/api/src/incidents/leak-baseline-detection.service.ts`
- Create: `apps/api/src/incidents/leak-baseline-detection.service.spec.ts`
- Modify: `apps/api/src/incidents/incidents.controller.ts`
- Modify: `apps/api/src/incidents/incidents.module.ts`
- Modify: `apps/api/src/readings/readings.service.ts`
- Modify: `packages/types/src/api.ts`
- Modify: `http/50-water-response.http`

- [x] **Step 1: Write failing detector tests**

```ts
it("does not evaluate until fourteen distinct valid water-reading days exist", async () => {
  await detector.evaluateAcceptedReading({ meter, reading });
  expect(persistence.listLeakIncidents({ organizationId })).toHaveLength(0);
});

it("opens a deduplicated baseline incident when an hourly value exceeds the configured multiplier", async () => {
  await detector.evaluateAcceptedReading({ meter, reading });
  expect(persistence.listLeakIncidents({ organizationId })).toHaveLength(1);
});
```

- [x] **Step 2: Run the focused baseline test**

Run: `pnpm --filter @iot-management/api test -- src/incidents/leak-baseline-detection.service.spec.ts`
Expected: FAIL because the baseline detector is absent.

- [x] **Step 3: Implement conservative opt-in detection**

```ts
const baseline = average(hourlyUsageByLocalHour(validReadings));
if (settings.enabled && validDays >= settings.minimumValidDays && reading.value > baseline * settings.thresholdMultiplier) {
  // create or update one unresolved meter-anomaly incident
}
```

Only consider water interval readings with `quality === "good"`, one or more hours of sample history, and fourteen distinct UTC calendar days before the incoming reading. Exclude the current reading from the baseline. Use the existing incident deduplication method and write evidence/audit/activity records when a threshold breach opens or extends an incident. Add owner-only get/patch settings routes; manager and viewer attempts must be rejected.

- [x] **Step 4: Run detector and ingestion regression tests**

Run: `pnpm --filter @iot-management/api test -- src/incidents/leak-baseline-detection.service.spec.ts src/readings/readings.service.spec.ts`
Expected: PASS.

### Task 5: Dashboard And Full Verification

**Files:**
- Create: `apps/web-dashboard/features/reports/leak-response-report.tsx`
- Modify: `apps/web-dashboard/features/reports/reports-panel.tsx`
- Modify: `apps/web-dashboard/tests/reports.spec.ts`
- Modify: `docs/superpowers/plans/2026-07-02-water-leak-to-resolution.md`

- [x] **Step 1: Write a failing UI test for the leak report section**

```ts
await expect(page.getByRole("heading", { name: "Leak Response Report" })).toBeVisible();
await expect(page.getByRole("link", { name: "Download leak CSV" })).toBeVisible();
```

- [x] **Step 2: Run the targeted Playwright test**

Run: `pnpm --filter @iot-management/web-dashboard test:e2e -- reports.spec.ts`
Expected: FAIL because the section and export links do not exist.

- [x] **Step 3: Render analytics with real API data**

Add a compact report section with acknowledgement/containment/resolution summaries, recurring locations, resolution outcomes, and CSV/PDF download links. Preserve loading, error, empty, and viewer read-only states. Do not introduce a second dashboard shell.

- [x] **Step 4: Run full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm --filter @iot-management/api test:e2e && pnpm --filter @iot-management/web-dashboard test:e2e && pnpm validate:http-client`
Expected: all commands pass. Update the Phase 7 checklist and provide manual verification steps for owner, manager, viewer, tenant isolation, CSV, PDF, and the fourteen-day baseline guard.

## Manual Verification

1. Start PostgreSQL and Redis, then run `corepack pnpm db:migrate`, `corepack pnpm seed:demo`, and `API_PORT=3001 corepack pnpm --filter @iot-management/api dev`.
2. In IntelliJ, select the `local` HTTP environment, run `http/00-system-auth.http`, then `http/10-portfolio-meters.http` and `http/50-water-response.http`. The latter can enable the opt-in baseline setting and read `GET /incidents/analytics`.
3. Run `http/30-alerts-reports-audit.http`. `GET /reports/leak-response` returns JSON; the export endpoints return a CSV attachment and a PDF file beginning with `%PDF-`.
4. Log in as `manager@north.example` or `viewer@north.example` and attempt `PATCH /leak-baseline-settings`. Expected: `403 ROLE_FORBIDDEN`. Run the same request as the North owner. Expected: `200` and the organization baseline settings.
5. In the dashboard, open `http://127.0.0.1:3000/reports`. Expected: the existing monthly report plus a Leak Response Report with response-time, excess-water, recurring-location, outcome data, and CSV/PDF download actions.
6. For a baseline detector check, submit 14 good water interval readings for one meter at the same UTC hour on distinct days, enable the setting, then submit a value greater than the historical mean multiplied by `thresholdMultiplier`. Expected: one open `meter_anomaly` incident with a policy-free evidence row; a later breach for the same meter extends that incident rather than creating a second unresolved one.
