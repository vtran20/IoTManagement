# Smart Utilities SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phased, testable smart water and electric utilities SaaS for apartment and building owners, starting with simulated meter data and a production-shaped REST API.

**Architecture:** Use a TypeScript monorepo with a NestJS modular-monolith REST API, a Next.js operational dashboard, shared domain types, PostgreSQL persistence, and Redis/BullMQ background jobs. Simulated meters must send data through the same normalized ingestion contract that future real devices will use.

**Tech Stack:** TypeScript, pnpm workspaces, NestJS, Next.js, Tailwind CSS, shadcn/ui, TanStack Query, TanStack Table, Recharts, PostgreSQL, Prisma or TypeORM, Redis, BullMQ, Jest or Vitest, Playwright.

---

## Source Documents

- Product and architecture spec: `docs/superpowers/specs/2026-06-29-iot-utilities-saas-design.md`
- Project agent rules: `AGENTS.md`
- Project Codex skill: `.codex/skills/iot-utilities-saas/SKILL.md`
- Project quick rules: `.codex/rules/iot-utilities-saas.md`

## Non-Negotiable Implementation Rules

- Use Superpowers planning before implementation.
- Use test-driven development for every feature, behavior change, refactor, and bug fix.
- For every bug fix, add a regression test that fails before the fix and passes after the fix.
- Keep phase work small enough that each phase can be tested and committed independently.
- Keep raw meter readings immutable after ingestion.
- Scope all customer data by `organizationId`.
- Never mix user authentication credentials with device or gateway credentials.
- Keep dashboard-facing APIs independent of specific device protocols.

## Testing Contract

Every implementation task must follow this loop:

1. Write a focused failing test for the desired behavior.
2. Run the test and confirm it fails for the expected reason.
3. Implement the smallest code change that passes the test.
4. Run the focused test and confirm it passes.
5. Run the relevant surrounding test suite.
6. Commit the tested change.

Bug-fix protocol:

1. Reproduce the bug with a failing regression test.
2. Confirm the test fails before the fix.
3. Fix the bug.
4. Confirm the regression test passes.
5. Run related unit, integration, or end-to-end tests.
6. Keep the regression test permanently.

Minimum test coverage by area:

- Domain services: unit tests.
- REST endpoints: integration tests.
- Tenant scoping: negative tests that prove cross-organization access is blocked.
- Ingestion: duplicate, invalid, unknown meter, stale timestamp, and accepted reading tests.
- Simulation: deterministic seeded unit tests.
- Aggregation and alerts: unit tests plus job integration tests.
- Dashboard UI: component tests for loading, empty, error, and success states.
- Critical workflows: Playwright end-to-end tests.

Recommended verification commands once tooling exists:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Repository Structure

Target structure:

```text
apps/
  api/
    src/
      auth/
      tenants/
      portfolio/
      meters/
      readings/
      simulations/
      analytics/
      alerts/
      dashboard/
      reports/
      common/
    test/
  web-dashboard/
    app/
    components/
    features/
    lib/
    tests/
  mobile-app/
    README.md

packages/
  api-client/
    src/
  types/
    src/
  config/
  ui/
    src/

docs/
  superpowers/
    specs/
    plans/
```

Responsibility map:

- `apps/api`: REST API, domain services, persistence, background jobs, OpenAPI docs.
- `apps/web-dashboard`: SaaS dashboard, dashboard routes, feature components, API-backed views.
- `apps/mobile-app`: reserved for Expo mobile app work after MVP web workflows are stable.
- `packages/types`: shared enums, DTO-like TypeScript contracts, dashboard response types.
- `packages/api-client`: typed REST client used by web dashboard and future mobile app.
- `packages/config`: shared TypeScript, ESLint, Prettier, and test config.
- `packages/ui`: shared UI primitives and design tokens when web and mobile reuse is practical.

## Data Model Decisions

Use these names consistently:

- `Organization`
- `User`
- `Membership`
- `Building`
- `Floor`
- `Unit`
- `Meter`
- `MeterReading`
- `UsageAggregate`
- `AlertRule`
- `AlertEvent`

Core enums:

```text
UserRole: owner | manager | viewer | tenant
UtilityType: water | electric
MeterSource: simulated | gateway | direct_api | mqtt
MeterStatus: online | offline | stale | disabled
ReadingUnit: gallon | liter | kwh
ReadingKind: cumulative | interval
ReadingQuality: good | estimated | duplicate | invalid
AggregatePeriodType: hour | day | month
AlertScopeType: organization | building | unit | meter
AlertConditionType: high_usage | leak_suspected | stale_device | outage_suspected
AlertSeverity: info | warning | critical
AlertStatus: open | acknowledged | resolved
```

Indexing requirements:

- Every customer-owned table needs `organizationId`.
- Add indexes for `organizationId`.
- Add indexes for common parent lookups such as `buildingId`, `floorId`, `unitId`, and `meterId`.
- Add a unique constraint for readings by `meterId` and `measuredAt`.
- Add a unique constraint for meter identity by `organizationId` and `externalId`.

## API Conventions

- Version all endpoints under `/api/v1`.
- Use DTO validation for every request body and query string.
- Derive tenant scope from authenticated membership.
- Use pagination for list endpoints before list sizes grow.
- Return predictable error shapes.
- Generate OpenAPI docs from the backend.

Standard API error shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [
      {
        "field": "meterExternalId",
        "message": "meterExternalId is required"
      }
    ]
  }
}
```

## Phase 0: Planning and Baseline Controls

**Goal:** Lock in project governance and plan execution checkpoints.

**Deliverables:**

- Existing design spec remains the product source of truth.
- This implementation plan is committed.
- Testing requirements are explicit before code exists.

**Files:**

- Modify as needed: `docs/superpowers/plans/2026-06-30-smart-utilities-saas-implementation.md`
- Read before implementation: `AGENTS.md`
- Read before implementation: `.codex/skills/iot-utilities-saas/SKILL.md`

**Tasks:**

- [ ] Review this plan against the design spec.
- [ ] Confirm phase boundaries with the user.
- [ ] Decide whether Phase 1 execution uses subagent-driven development or inline execution.
- [ ] For every later phase, use TDD and commit after tests pass.

**Exit criteria:**

- Plan is reviewed.
- No implementation starts before the user approves execution.

## Phase 1: Monorepo, Tooling, and Local Runtime

**Goal:** Create the project foundation and make one command set run linting, type checks, tests, API, dashboard, database, and Redis locally.

**Deliverables:**

- pnpm workspace.
- Shared TypeScript config.
- Lint and formatting config.
- API app scaffold.
- Web dashboard scaffold.
- Docker Compose for PostgreSQL and Redis.
- Basic CI-ready scripts.

**Files to create:**

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `.editorconfig`
- `.gitignore`
- `.env.example`
- `docker-compose.yml`
- `packages/config/package.json`
- `packages/config/tsconfig/base.json`
- `packages/types/package.json`
- `packages/types/src/index.ts`
- `packages/api-client/package.json`
- `packages/api-client/src/index.ts`
- `apps/api/package.json`
- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/health/health.controller.ts`
- `apps/api/test/health.e2e-spec.ts`
- `apps/web-dashboard/package.json`
- `apps/web-dashboard/app/page.tsx`
- `apps/web-dashboard/tests/home.spec.ts`

**Implementation tasks:**

- [ ] Create workspace files and package scripts.
- [ ] Add Docker Compose services named `postgres` and `redis`.
- [ ] Scaffold NestJS API with a health endpoint at `GET /api/v1/health`.
- [ ] Scaffold Next.js dashboard with a first screen that points to the working dashboard shell.
- [ ] Add unit, integration, and end-to-end test commands.
- [ ] Add a failing health endpoint test before implementing the health endpoint.
- [ ] Add a web smoke test before finalizing the dashboard scaffold.

**Required tests:**

- `apps/api/test/health.e2e-spec.ts` verifies `GET /api/v1/health` returns API status.
- `apps/web-dashboard/tests/home.spec.ts` verifies the dashboard app renders the initial dashboard shell.

**Suggested commands:**

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
docker compose up -d postgres redis
```

**Exit criteria:**

- API health test passes.
- Dashboard smoke test passes.
- Lint and typecheck pass.
- Local database and Redis can start with Docker Compose.

## Phase 2: Shared Domain Contracts

**Goal:** Define shared domain types before API and dashboard implementations diverge.

**Deliverables:**

- Shared enums.
- Shared identifiers.
- Shared DTO and response types.
- API client shell with typed request helpers.

**Files to create or modify:**

- `packages/types/src/domain.ts`
- `packages/types/src/api.ts`
- `packages/types/src/dashboard.ts`
- `packages/types/src/index.ts`
- `packages/api-client/src/client.ts`
- `packages/api-client/src/endpoints.ts`
- `packages/api-client/src/index.ts`
- `packages/types/src/domain.test.ts`
- `packages/api-client/src/client.test.ts`

**Implementation tasks:**

- [ ] Write tests for domain enum values.
- [ ] Define `UtilityType`, `MeterStatus`, `ReadingKind`, `ReadingQuality`, roles, alert statuses, and alert severities.
- [ ] Define shared request and response contracts for auth, buildings, units, meters, readings, dashboard summaries, alerts, and reports.
- [ ] Write tests for API client URL construction.
- [ ] Implement an API client that accepts `baseUrl`, `fetch`, and auth options.

**Required tests:**

- Domain enum test proves stable string values.
- API client test proves `/api/v1` prefixing is consistent.
- API client test proves query parameters serialize predictably.

**Exit criteria:**

- Shared contracts compile.
- API client tests pass.
- Dashboard and API can import from `packages/types`.

## Phase 3: Backend Persistence, Auth, and Tenant Boundary

**Goal:** Establish secure SaaS tenant boundaries before customer data features are added.

**Deliverables:**

- Database schema and migrations.
- Auth module.
- Organization and membership module.
- Request context that carries authenticated user and organization membership.
- Role guard for owner, manager, viewer, and future tenant.

**Files to create or modify:**

- `apps/api/src/common/request-context.ts`
- `apps/api/src/common/errors/api-error.filter.ts`
- `apps/api/src/common/guards/auth.guard.ts`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/dto/login.dto.ts`
- `apps/api/src/tenants/tenants.module.ts`
- `apps/api/src/tenants/organizations.service.ts`
- `apps/api/src/tenants/memberships.service.ts`
- `apps/api/src/tenants/organizations.controller.ts`
- `apps/api/src/tenants/memberships.controller.ts`
- `apps/api/test/auth.e2e-spec.ts`
- `apps/api/test/tenant-isolation.e2e-spec.ts`

**Implementation tasks:**

- [ ] Write a failing auth integration test for successful login.
- [ ] Write a failing auth integration test for invalid credentials.
- [ ] Implement password hashing and login.
- [ ] Write a failing membership test proving `GET /api/v1/organizations/current` returns only the current organization.
- [ ] Implement organization and membership services.
- [ ] Write a failing cross-organization access test.
- [ ] Implement request scoping and role guards.

**Required tests:**

- Login success.
- Login failure.
- Current user response.
- Current organization response.
- Cross-organization access denied.
- Viewer cannot perform manager or owner actions.

**Exit criteria:**

- Tenant boundary tests pass.
- Auth endpoints return consistent error shapes.
- All organization-owned service methods require organization scope.

## Phase 4: Portfolio and Meter Inventory

**Goal:** Manage buildings, floors, units, and meters with tenant-safe CRUD APIs.

**Deliverables:**

- Building CRUD.
- Floor CRUD.
- Unit CRUD.
- Meter CRUD.
- Meter assignment to either unit-level or building-level shared scope.

**Files to create or modify:**

- `apps/api/src/portfolio/portfolio.module.ts`
- `apps/api/src/portfolio/buildings.controller.ts`
- `apps/api/src/portfolio/buildings.service.ts`
- `apps/api/src/portfolio/floors.controller.ts`
- `apps/api/src/portfolio/floors.service.ts`
- `apps/api/src/portfolio/units.controller.ts`
- `apps/api/src/portfolio/units.service.ts`
- `apps/api/src/meters/meters.module.ts`
- `apps/api/src/meters/meters.controller.ts`
- `apps/api/src/meters/meters.service.ts`
- `apps/api/src/meters/dto/create-meter.dto.ts`
- `apps/api/src/meters/dto/update-meter.dto.ts`
- `apps/api/test/portfolio.e2e-spec.ts`
- `apps/api/test/meters.e2e-spec.ts`

**Implementation tasks:**

- [ ] Write failing building create/list tests.
- [ ] Implement building create/list.
- [ ] Write failing building detail/update tests.
- [ ] Implement building detail/update.
- [ ] Write failing floor create/list tests.
- [ ] Implement floor create/list.
- [ ] Write failing unit create/list/detail/update tests.
- [ ] Implement unit create/list/detail/update.
- [ ] Write failing meter create/list/detail/update tests.
- [ ] Implement meter create/list/detail/update.
- [ ] Write failing tests for unit-level and building-level meter assignment.
- [ ] Implement assignment validation.

**Required tests:**

- Organization A cannot read Organization B buildings, units, or meters.
- Meter `externalId` is unique inside an organization.
- Water meter supports gallon and liter readings.
- Electric meter supports kwh readings.
- Building-level shared meter can exist without `unitId`.
- Unit-level meter must belong to a unit in the same organization.

**Exit criteria:**

- CRUD endpoints work for authenticated users with proper roles.
- Cross-tenant negative tests pass.
- Meter assignment rules are enforced.

## Phase 5: Reading Ingestion

**Goal:** Accept simulated or future device readings through one normalized ingestion endpoint.

**Deliverables:**

- `POST /api/v1/readings/ingest`.
- Reading validation.
- Idempotent duplicate handling.
- Raw reading persistence.
- Meter `lastReadingAt` and status update.
- Reading list endpoint by meter.

**Files to create or modify:**

- `apps/api/src/readings/readings.module.ts`
- `apps/api/src/readings/readings.controller.ts`
- `apps/api/src/readings/readings.service.ts`
- `apps/api/src/readings/dto/ingest-reading.dto.ts`
- `apps/api/src/readings/reading-validation.service.ts`
- `apps/api/src/meters/meter-health.service.ts`
- `apps/api/test/readings-ingest.e2e-spec.ts`
- `apps/api/test/readings.service.spec.ts`

**Implementation tasks:**

- [ ] Write failing test for accepted water reading.
- [ ] Implement accepted water reading ingestion.
- [ ] Write failing test for accepted electric reading.
- [ ] Implement accepted electric reading ingestion.
- [ ] Write failing test for duplicate meter timestamp.
- [ ] Implement idempotent duplicate behavior.
- [ ] Write failing test for unknown `meterExternalId`.
- [ ] Implement unknown meter rejection.
- [ ] Write failing test for invalid unit by utility type.
- [ ] Implement utility/unit compatibility validation.
- [ ] Write failing test for negative values.
- [ ] Implement negative value rejection.
- [ ] Write failing test for stale measured timestamp policy.
- [ ] Implement stale timestamp validation.

**Required tests:**

- Accepted readings persist as raw readings.
- Duplicate readings are ignored or marked duplicate according to the service contract.
- Unknown meter returns `404` or domain-specific `UNKNOWN_METER`.
- Invalid unit returns validation error.
- Negative value returns validation error.
- Accepted reading updates `Meter.lastReadingAt`.
- Cross-organization meter external IDs cannot be used for ingestion.

**Exit criteria:**

- The ingestion endpoint can be used by simulation and future device gateways.
- Raw readings are immutable after acceptance.
- Ingestion tests pass.

## Phase 6: Simulation Engine

**Goal:** Generate realistic, deterministic water and electric readings for demo buildings and test scenarios.

**Deliverables:**

- Seeded data generator.
- Simulation service.
- Simulation REST endpoints.
- Normal usage curves by time of day.
- Controlled anomalies: leak, spike, offline meter.
- Simulation sends through the ingestion service, not direct database writes.

**Files to create or modify:**

- `apps/api/src/simulations/simulations.module.ts`
- `apps/api/src/simulations/simulations.controller.ts`
- `apps/api/src/simulations/simulations.service.ts`
- `apps/api/src/simulations/simulated-usage-profile.ts`
- `apps/api/src/simulations/simulation-clock.ts`
- `apps/api/src/simulations/dto/run-simulation.dto.ts`
- `apps/api/test/simulations.e2e-spec.ts`
- `apps/api/src/simulations/simulations.service.spec.ts`

**Implementation tasks:**

- [ ] Write failing unit test for deterministic water readings with the same seed.
- [ ] Implement seeded water reading generation.
- [ ] Write failing unit test for deterministic electric readings with the same seed.
- [ ] Implement seeded electric reading generation.
- [ ] Write failing unit test for high-usage spike scenario.
- [ ] Implement spike scenario.
- [ ] Write failing unit test for leak scenario.
- [ ] Implement leak scenario.
- [ ] Write failing unit test for offline meter scenario.
- [ ] Implement offline scenario.
- [ ] Write failing integration test proving simulation calls ingestion.
- [ ] Implement simulation run endpoint.

**Required tests:**

- Same seed produces same reading series.
- Different seed produces different reading series.
- Leak scenario creates continuous water usage during idle hours.
- Spike scenario creates short high usage.
- Offline scenario skips readings for selected meters.
- Simulation uses ingestion validation and duplicate handling.

**Exit criteria:**

- A demo organization can generate readings for dashboard work.
- Simulation is deterministic enough for repeatable tests.

## Phase 7: Aggregation and Analytics

**Goal:** Convert raw readings into dashboard-ready hourly, daily, and monthly usage summaries.

**Deliverables:**

- Aggregation job.
- Usage aggregate table.
- Dashboard summary service.
- Usage trends endpoint.
- Building breakdown endpoint.
- Unit ranking endpoint.
- Device health endpoint.
- Cost estimate support.

**Files to create or modify:**

- `apps/api/src/analytics/analytics.module.ts`
- `apps/api/src/analytics/aggregation.service.ts`
- `apps/api/src/analytics/cost-estimate.service.ts`
- `apps/api/src/analytics/usage-query.service.ts`
- `apps/api/src/dashboard/dashboard.module.ts`
- `apps/api/src/dashboard/dashboard.controller.ts`
- `apps/api/src/dashboard/dashboard.service.ts`
- `apps/api/src/jobs/jobs.module.ts`
- `apps/api/src/jobs/queues.ts`
- `apps/api/test/analytics.service.spec.ts`
- `apps/api/test/dashboard.e2e-spec.ts`

**Implementation tasks:**

- [ ] Write failing test for interval usage from cumulative readings.
- [ ] Implement cumulative-to-usage calculation.
- [ ] Write failing test for hourly aggregation.
- [ ] Implement hourly aggregation.
- [ ] Write failing test for daily aggregation.
- [ ] Implement daily aggregation.
- [ ] Write failing test for monthly aggregation.
- [ ] Implement monthly aggregation.
- [ ] Write failing test for cost estimates.
- [ ] Implement configurable cost estimate logic.
- [ ] Write failing dashboard summary endpoint test.
- [ ] Implement dashboard summary endpoint.
- [ ] Write failing trends endpoint test.
- [ ] Implement trends endpoint.
- [ ] Write failing building breakdown endpoint test.
- [ ] Implement building breakdown endpoint.
- [ ] Write failing unit rankings endpoint test.
- [ ] Implement unit rankings endpoint.
- [ ] Write failing device health endpoint test.
- [ ] Implement device health endpoint.

**Required tests:**

- Aggregation handles water and electric independently.
- Aggregation ignores invalid or duplicate readings.
- Cost estimates use configured rates.
- Dashboard endpoints are organization-scoped.
- Device health reports online, stale, offline, and disabled states.

**Exit criteria:**

- Dashboard API can support Overview, Buildings, Units, and Meters pages.
- Aggregates are reproducible in tests.

## Phase 8: Alert Rules and Alert Events

**Goal:** Detect high usage, suspected leaks, stale devices, and suspected outages.

**Deliverables:**

- Alert rule CRUD.
- Alert evaluation service.
- Alert events.
- Acknowledge and resolve workflow.
- Alert dashboard endpoint support.

**Files to create or modify:**

- `apps/api/src/alerts/alerts.module.ts`
- `apps/api/src/alerts/alert-rules.controller.ts`
- `apps/api/src/alerts/alert-rules.service.ts`
- `apps/api/src/alerts/alerts.controller.ts`
- `apps/api/src/alerts/alert-events.service.ts`
- `apps/api/src/alerts/alert-evaluator.service.ts`
- `apps/api/src/alerts/dto/create-alert-rule.dto.ts`
- `apps/api/src/alerts/dto/update-alert-rule.dto.ts`
- `apps/api/test/alert-rules.e2e-spec.ts`
- `apps/api/test/alerts.e2e-spec.ts`
- `apps/api/src/alerts/alert-evaluator.service.spec.ts`

**Implementation tasks:**

- [ ] Write failing alert rule create/list/update tests.
- [ ] Implement alert rule CRUD.
- [ ] Write failing high-usage evaluator test.
- [ ] Implement high-usage evaluator.
- [ ] Write failing leak-suspected evaluator test.
- [ ] Implement leak-suspected evaluator.
- [ ] Write failing stale-device evaluator test.
- [ ] Implement stale-device evaluator.
- [ ] Write failing outage-suspected evaluator test.
- [ ] Implement outage-suspected evaluator.
- [ ] Write failing alert acknowledgement test.
- [ ] Implement acknowledgement.
- [ ] Write failing alert resolution test.
- [ ] Implement resolution.

**Required tests:**

- Disabled rules do not trigger events.
- Alerts are scoped by organization.
- Repeated evaluation does not create duplicate open alerts for the same active condition.
- Acknowledged alerts remain open until resolved.
- Resolved alerts retain trigger and resolution timestamps.

**Exit criteria:**

- Alert rules can be configured.
- Alert events appear in dashboard APIs.
- Alert workflow supports open, acknowledged, and resolved states.

## Phase 9: Web Dashboard MVP

**Goal:** Build the operational SaaS dashboard for building owners.

**Deliverables:**

- Authenticated dashboard shell.
- Overview page.
- Buildings page and building detail.
- Units page.
- Meters page.
- Alerts page.
- Reports page with monthly usage.
- Settings page for organization and rates.

**Files to create or modify:**

- `apps/web-dashboard/app/layout.tsx`
- `apps/web-dashboard/app/page.tsx`
- `apps/web-dashboard/app/login/page.tsx`
- `apps/web-dashboard/app/dashboard/page.tsx`
- `apps/web-dashboard/app/buildings/page.tsx`
- `apps/web-dashboard/app/buildings/[buildingId]/page.tsx`
- `apps/web-dashboard/app/units/page.tsx`
- `apps/web-dashboard/app/meters/page.tsx`
- `apps/web-dashboard/app/alerts/page.tsx`
- `apps/web-dashboard/app/reports/page.tsx`
- `apps/web-dashboard/app/settings/page.tsx`
- `apps/web-dashboard/components/app-shell.tsx`
- `apps/web-dashboard/components/nav.tsx`
- `apps/web-dashboard/features/dashboard/overview-cards.tsx`
- `apps/web-dashboard/features/dashboard/usage-trend-chart.tsx`
- `apps/web-dashboard/features/dashboard/building-breakdown-chart.tsx`
- `apps/web-dashboard/features/dashboard/unit-rankings-table.tsx`
- `apps/web-dashboard/features/buildings/buildings-table.tsx`
- `apps/web-dashboard/features/units/units-table.tsx`
- `apps/web-dashboard/features/meters/meters-table.tsx`
- `apps/web-dashboard/features/alerts/alerts-table.tsx`
- `apps/web-dashboard/lib/api.ts`
- `apps/web-dashboard/tests/dashboard.spec.ts`
- `apps/web-dashboard/tests/alerts.spec.ts`

**Implementation tasks:**

- [ ] Write failing test for app shell navigation.
- [ ] Implement app shell navigation.
- [ ] Write failing test for login success and login error states.
- [ ] Implement login page.
- [ ] Write failing test for overview loading, empty, error, and success states.
- [ ] Implement overview page.
- [ ] Write failing test for buildings table.
- [ ] Implement buildings page.
- [ ] Write failing test for building detail.
- [ ] Implement building detail page.
- [ ] Write failing test for units table filtering.
- [ ] Implement units page.
- [ ] Write failing test for meters health display.
- [ ] Implement meters page.
- [ ] Write failing test for alert acknowledgement.
- [ ] Implement alerts page.
- [ ] Write failing test for reports monthly usage display.
- [ ] Implement reports page.
- [ ] Write failing test for settings rate update.
- [ ] Implement settings page.

**Required tests:**

- Login page handles bad credentials.
- Dashboard handles API loading state.
- Dashboard handles empty organization state.
- Dashboard handles API error state.
- Dashboard renders water and electric usage.
- Alerts can be acknowledged from the UI.
- Tables remain readable with long building, unit, and meter names.

**Exit criteria:**

- A building owner can log in and use the dashboard to inspect usage, meters, and alerts.
- Web smoke and critical workflow tests pass.

## Phase 10: Reports and Operational Polish

**Goal:** Make monthly reporting and daily operations useful enough for demo and early customer validation.

**Deliverables:**

- Monthly usage report API.
- Monthly usage dashboard page.
- Export-ready report model.
- Better empty states.
- Seed/demo data command.

**Files to create or modify:**

- `apps/api/src/reports/reports.module.ts`
- `apps/api/src/reports/reports.controller.ts`
- `apps/api/src/reports/reports.service.ts`
- `apps/api/test/reports.e2e-spec.ts`
- `apps/web-dashboard/features/reports/monthly-usage-report.tsx`
- `apps/web-dashboard/tests/reports.spec.ts`
- `apps/api/src/simulations/demo-seed.service.ts`

**Implementation tasks:**

- [ ] Write failing monthly report API test.
- [ ] Implement monthly report API.
- [ ] Write failing report UI test.
- [ ] Implement report UI.
- [ ] Write failing demo seed command test.
- [ ] Implement deterministic demo seed command.
- [ ] Write failing test for no-data report state.
- [ ] Implement no-data report state.

**Required tests:**

- Monthly report groups usage by building and unit.
- Monthly report includes water, electric, and estimated cost.
- Report is organization-scoped.
- Demo seed command creates predictable data.

**Exit criteria:**

- Demo environment can be reset and repopulated.
- Monthly reports are useful without manual database edits.

## Phase 11: Security, Reliability, and Observability Hardening

**Goal:** Strengthen the MVP before external demos or pilot users.

**Deliverables:**

- Structured logging.
- Health checks for API, PostgreSQL, and Redis.
- Rate limiting for auth and ingestion endpoints.
- Consistent error filter.
- Audit-friendly alert lifecycle logging.
- Tenant isolation regression suite.

**Files to create or modify:**

- `apps/api/src/common/logging/logger.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/src/common/rate-limit/rate-limit.module.ts`
- `apps/api/src/health/health.service.ts`
- `apps/api/test/security.e2e-spec.ts`
- `apps/api/test/tenant-isolation-regression.e2e-spec.ts`

**Implementation tasks:**

- [ ] Write failing test for structured error response.
- [ ] Implement global error filter.
- [ ] Write failing health check test for database and Redis status.
- [ ] Implement dependency health checks.
- [ ] Write failing auth rate-limit test.
- [ ] Implement auth rate limiting.
- [ ] Write failing ingestion rate-limit test.
- [ ] Implement ingestion rate limiting.
- [ ] Write failing tenant-isolation regression suite.
- [ ] Implement any missing tenant guards found by the suite.

**Required tests:**

- Every protected endpoint rejects unauthenticated requests.
- Viewer cannot mutate protected resources.
- Cross-organization resource IDs are blocked.
- Error responses do not leak stack traces.
- Logs do not include passwords, tokens, or device credentials.

**Exit criteria:**

- Security regression suite passes.
- Operational health endpoint can support deployment monitoring.

## Phase 12: Deployment Readiness

**Goal:** Prepare the SaaS for a repeatable non-production deployment.

**Deliverables:**

- Environment variable documentation.
- Production build scripts.
- Database migration command.
- Seed command for demo environments.
- Deployment notes.

**Files to create or modify:**

- `.env.example`
- `docs/deployment/local.md`
- `docs/deployment/non-production.md`
- `apps/api/src/config/env.schema.ts`
- `apps/api/test/env-config.spec.ts`
- `package.json`

**Implementation tasks:**

- [ ] Write failing environment validation tests.
- [ ] Implement environment validation.
- [ ] Add production build scripts.
- [ ] Add migration command documentation.
- [ ] Add local deployment instructions.
- [ ] Add non-production deployment instructions.

**Required tests:**

- Missing required environment variables fail fast.
- Invalid environment values fail fast.
- Production build command succeeds.

**Exit criteria:**

- A new developer can run the project locally from docs.
- A non-production environment can be deployed repeatably.

## Phase 13: Mobile App Foundation

**Goal:** Add Expo mobile foundations for future alert and management workflows after the web MVP is stable.

**Deliverables:**

- Expo app scaffold.
- Shared API client usage.
- Login screen.
- Alert list.
- Alert detail and acknowledgement.
- Basic usage summary.

**Files to create or modify:**

- `apps/mobile-app/package.json`
- `apps/mobile-app/app.json`
- `apps/mobile-app/app/_layout.tsx`
- `apps/mobile-app/app/login.tsx`
- `apps/mobile-app/app/alerts/index.tsx`
- `apps/mobile-app/app/alerts/[alertId].tsx`
- `apps/mobile-app/app/summary.tsx`
- `apps/mobile-app/src/api/client.ts`
- `apps/mobile-app/src/auth/session.ts`
- `apps/mobile-app/__tests__/alerts.test.tsx`

**Implementation tasks:**

- [ ] Write failing mobile login screen test.
- [ ] Implement mobile login screen.
- [ ] Write failing alert list test.
- [ ] Implement alert list.
- [ ] Write failing alert acknowledgement test.
- [ ] Implement alert acknowledgement.
- [ ] Write failing summary screen test.
- [ ] Implement summary screen.

**Required tests:**

- Mobile app uses shared API contracts.
- Alert acknowledgement calls the same REST endpoint as web.
- Auth failure is visible to the user.

**Exit criteria:**

- Mobile app can support alert management against the existing API.

## Phase 14: Real Device Integration Readiness

**Goal:** Prepare for real smart meters without disrupting the simulated-data MVP.

**Deliverables:**

- Device registry.
- Device credentials separate from user credentials.
- Gateway ingestion credential model.
- Device revocation.
- Replay protection design.
- MQTT adapter plan and optional proof of concept.

**Files to create or modify:**

- `apps/api/src/devices/devices.module.ts`
- `apps/api/src/devices/devices.controller.ts`
- `apps/api/src/devices/devices.service.ts`
- `apps/api/src/devices/device-credentials.service.ts`
- `apps/api/src/devices/dto/register-device.dto.ts`
- `apps/api/test/devices.e2e-spec.ts`
- `docs/device-integrations/gateway-ingestion.md`
- `docs/device-integrations/mqtt-adapter.md`

**Implementation tasks:**

- [ ] Write failing device registration test.
- [ ] Implement device registration.
- [ ] Write failing device credential creation test.
- [ ] Implement device credential creation.
- [ ] Write failing credential revocation test.
- [ ] Implement credential revocation.
- [ ] Write failing replay protection test.
- [ ] Implement timestamp and nonce validation for device ingestion credentials.
- [ ] Document gateway HTTPS ingestion.
- [ ] Document MQTT adapter boundary.

**Required tests:**

- User credentials cannot ingest device readings.
- Device credentials cannot call user dashboard APIs.
- Revoked device credentials cannot ingest readings.
- Replay attempts are rejected.
- Device readings still normalize to `MeterReading`.

**Exit criteria:**

- Real devices can be planned against a secure ingestion boundary.
- Existing simulated ingestion remains compatible.

## Phase Gates

Use these gates before moving between phases:

```text
Gate A: Tooling
  pnpm install, lint, typecheck, and test commands exist and run.

Gate B: Tenant Safety
  Cross-organization negative tests pass for every customer-owned endpoint.

Gate C: Ingestion Reliability
  Reading ingestion handles accepted, duplicate, invalid, stale, and unknown meter cases.

Gate D: Dashboard Usefulness
  Dashboard shows usage, cost, alerts, device health, trends, and empty/error states.

Gate E: Demo Readiness
  Demo seed data can be generated deterministically and reset repeatably.

Gate F: Pilot Readiness
  Security, tenant isolation, error handling, health checks, and rate limits are verified.
```

## Definition of Done

A phase is done only when:

- All planned unit tests for the phase pass.
- All planned integration tests for the phase pass.
- Any bug fixed during the phase has a permanent regression test.
- Lint and type checks pass.
- Relevant dashboard states are verified for frontend work.
- Tenant isolation is verified for backend work touching organization data.
- Documentation is updated when setup, API shape, or behavior changes.
- The phase is committed with a clear message.

## Implementation Order Summary

1. Phase 1: Monorepo, tooling, local runtime.
2. Phase 2: Shared domain contracts.
3. Phase 3: Backend persistence, auth, tenant boundary.
4. Phase 4: Portfolio and meter inventory.
5. Phase 5: Reading ingestion.
6. Phase 6: Simulation engine.
7. Phase 7: Aggregation and analytics.
8. Phase 8: Alert rules and alert events.
9. Phase 9: Web dashboard MVP.
10. Phase 10: Reports and operational polish.
11. Phase 11: Security, reliability, and observability hardening.
12. Phase 12: Deployment readiness.
13. Phase 13: Mobile app foundation.
14. Phase 14: Real device integration readiness.

## Recommended Execution Mode

Use subagent-driven development for implementation:

- One task or tightly related task group per subagent.
- Main agent reviews each result for spec compliance.
- Main agent runs verification before accepting a phase.
- Commit after each passing phase or small task group.

Use inline execution only when the user wants to keep the whole implementation in one session.
