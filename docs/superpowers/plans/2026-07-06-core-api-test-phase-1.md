# Core API Test Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add risk-first unit and API regression coverage for the Smart Utilities backend, and make work-order final cost optional at completion.

**Architecture:** Keep service tests narrow by injecting the existing persistence token and only the collaborators each service needs. Keep API e2e tests for workflows that cross authorization, persistence, or service boundaries; avoid duplicating existing endpoint coverage without a missing regression case.

**Tech Stack:** NestJS, TypeScript, Vitest, Supertest, PostgreSQL e2e schemas.

---

## Chunk 1: Work orders

### Task 1: Make completion cost optional and lock the lifecycle rules

**Files:**
- Modify: `apps/api/src/work-orders/work-orders.service.ts`
- Create: `apps/api/src/work-orders/work-orders.service.spec.ts`
- Modify: `apps/api/test/work-orders.e2e-spec.ts`

- [ ] Write unit tests proving a completed work order rejects a missing completion note, succeeds with a note and no final cost, rejects invalid transitions, and preserves role/assignee restrictions.
- [ ] Run the new unit test and observe the optional-cost assertion fail because `WORK_ORDER_FINAL_COST_REQUIRED` is still thrown.
- [ ] Remove only the final-cost completion guard; retain note, transition, role, and assignee guards.
- [ ] Update the e2e completion request to omit final cost and assert the completed state, timestamp, and persisted note.
- [ ] Run focused unit and work-order e2e tests; commit the chunk.

## Chunk 2: Tenant access and invitations

### Task 2: Add direct unit coverage for access-critical decisions

**Files:**
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Create: `apps/api/src/tenants/memberships.service.spec.ts`
- Create: `apps/api/src/invitations/invitations.service.spec.ts`
- Modify: `apps/api/test/security.e2e-spec.ts` only for uncovered role-escalation or cross-tenant regression cases.

- [ ] Write service tests for credential/session failure behavior, membership role mutation restrictions, invitation role assignment, and tenant-scoped lookup failures.
- [ ] Use focused dependency doubles; do not unit-test controllers or DTO decorators.
- [ ] Run each new unit test before and after the minimum testability adjustment, if one is required.
- [ ] Add only missing API regressions for denied owner/manager/viewer paths; run the focused suites and commit.

## Chunk 3: Meter and readings integrity

### Task 3: Cover meter lifecycle and reading validation decisions

**Files:**
- Create: `apps/api/src/meters/meters.service.spec.ts`
- Create: `apps/api/src/meters/meter-health.service.spec.ts`
- Create: `apps/api/src/readings/reading-validation.service.spec.ts`
- Modify: `apps/api/test/readings-ingest.e2e-spec.ts` and `apps/api/test/meters.e2e-spec.ts` only for uncovered regressions.

- [ ] Add unit tests for meter archive/restore and health classification, rejected reading units/timestamps/values, and accepted immutable/idempotent reading conditions.
- [ ] Confirm each test fails against the missing behavior or untested branch before adding production changes; do not change established ingestion semantics.
- [ ] Add API regressions only for missing tenant scope, duplicate handling, or immutable-reading workflows.
- [ ] Run focused unit/e2e suites and commit.

## Chunk 4: Alerts and incidents

### Task 4: Cover operational alert and incident decisions

**Files:**
- Create: `apps/api/src/alerts/alert-events.service.spec.ts`
- Create: `apps/api/src/alerts/alert-rules.service.spec.ts`
- Create: `apps/api/src/incidents/leak-incidents.service.spec.ts`
- Create: `apps/api/src/incidents/leak-detection-policies.service.spec.ts`
- Modify existing alert/incident e2e specs only for missing lifecycle or tenant-isolation regressions.

- [ ] Add unit tests for alert state changes, rule validation/scope, incident linkage/resolution, and leak-policy decision boundaries.
- [ ] Preserve existing alert evaluation and detection unit suites; do not duplicate their algorithm coverage.
- [ ] Add e2e tests only for previously unprotected state transitions or authorization boundaries.
- [ ] Run focused suites and commit.

## Chunk 5: Analytics and reports

### Task 5: Cover usage, cost, and reporting decisions

**Files:**
- Create: `apps/api/src/analytics/aggregation.service.spec.ts`
- Create: `apps/api/src/analytics/cost-estimate.service.spec.ts`
- Create: `apps/api/src/analytics/usage-query.service.spec.ts`
- Create: `apps/api/src/reports/reports.service.spec.ts`
- Modify: `apps/api/test/reports.e2e-spec.ts` only for unprotected cost/export regressions.

- [ ] Add service tests for period aggregation, utility-rate cost calculation, scoped usage ranges, and report row/export behavior.
- [ ] Keep fixture data deterministic and assert water/electric results separately.
- [ ] Add API regression tests only for cost totals, tenant scope, or export content not already covered.
- [ ] Run focused suites, then run `pnpm test`, `pnpm --filter @iot-management/api test:e2e`, `pnpm lint`, `pnpm typecheck`, and `pnpm qa:fast`; document any pre-existing blockers.
