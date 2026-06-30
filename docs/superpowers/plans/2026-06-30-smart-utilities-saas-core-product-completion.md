# Smart Utilities SaaS Core Product Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the smart utilities SaaS core product before mobile app or real-device integration work resumes.

**Architecture:** Keep the TypeScript monorepo, NestJS REST API, Next.js dashboard, shared types/client packages, PostgreSQL, Redis-ready jobs, Docker, and Kubernetes. Replace prototype runtime seams with PostgreSQL persistence, secure cookie sessions, real role-aware API/UI flows, deterministic demo data, and operational dashboard workflows.

**Tech Stack:** TypeScript, pnpm workspaces, NestJS 11.1, Next.js 16, React 19.2, PostgreSQL, `pg`, Kysely, Redis/BullMQ later in the core track, Tailwind/shadcn-style UI, Playwright, Vitest, Docker, Kubernetes/Kustomize.

---

## Current Direction

Phase 13 mobile and Phase 14 real-device integration are deferred. The active product goal is a complete web/API SaaS core:

- Real database persistence, not in-memory runtime state.
- Secure login, logout, password, invitation, and role workflows.
- Complete building, floor, unit, meter, alert, report, settings, and demo-data operations.
- Beautiful operational dashboard UI using the existing shadcnblocks-inspired direction.
- Rich deterministic data for testing and product review.
- Full regression coverage and manual verification after every phase.

## Non-Negotiable Rules

- Use TDD for feature, refactor, and bug-fix implementation.
- Preserve tenant isolation by `organizationId`.
- Preserve existing REST response shapes unless a phase explicitly changes them.
- Keep `text` public IDs for this track.
- Keep raw meter readings immutable after acceptance.
- Do not expose future tenant portal workflows in the UI yet.
- Use Dev outbox first for forgot-password and invitations.
- After each phase, run focused tests plus the available full verification set.
- After each phase, include manual verification steps in the final response.

## Cross-Phase Architecture

### Backend Modules

- `database`: PostgreSQL pool, Kysely instance, migrations, health checks.
- `persistence`: repository abstraction and concrete PostgreSQL implementation.
- `auth`: login, logout, sessions, password changes, forgot/reset password.
- `email`: provider interface plus Dev outbox implementation.
- `tenants`: organizations, memberships, invitations, role management.
- `portfolio`: buildings, floors, units, relationship validation.
- `meters`: meter assignment, status, readings linkage.
- `readings`: immutable ingestion and duplicate handling.
- `analytics`: aggregates, costs, trends, rankings.
- `alerts`: alert rules, events, lifecycle actions.
- `reports`: persisted report data and exports.
- `audit`: audit log creation and queries.
- `settings`: organization profile, rates, demo data controls.

### Frontend Areas

- Auth screens: login, logout, forgot password, reset password, invitation accept.
- App shell: secure route guard, role-aware nav, account menu.
- Dashboard: overview, trends, breakdowns, rankings, health, alerts.
- Portfolio: building, floor, unit, and meter list/detail/create/edit/archive.
- Alerts: rules, open events, acknowledge, resolve.
- Reports: monthly usage, export, no-data states.
- Settings: organization, users, profile/security, utility rates, demo data.

### Data And ID Rules

- SQL uses snake_case columns; TypeScript uses camelCase.
- `timestamptz` maps to ISO strings at API boundary.
- `numeric` maps to numbers after explicit conversion.
- Optional SQL `NULL` maps to `undefined` at API boundary.
- Public IDs remain text.
- Foreign-key relationships are enforced in SQL and services.

---

## Phase 1: PostgreSQL Persistence Foundation

**Goal:** Make PostgreSQL the runtime source of truth while keeping existing API behavior stable.

**Key design:**

- Add `pg`, Kysely, and `@types/pg`.
- Add `DatabaseModule`, `DatabaseService`, and typed schema definitions.
- Replace asset-only migration validation with a real migration runner.
- Create `schema_migrations` automatically from the runner.
- Use advisory lock, checksums, transactions, and idempotent skip behavior.
- Introduce a persistence abstraction that mirrors current `InMemoryPersistenceService`.
- Add `PostgresPersistenceService`.
- Keep `InMemoryPersistenceService` only for focused unit tests if useful.

**Implementation tasks:**

- [ ] Add failing migration e2e tests:
  - applies migrations once
  - skips already-applied migrations
  - fails on checksum mismatch
- [ ] Add failing PostgreSQL persistence e2e tests:
  - user/org/membership lookup
  - building/floor/unit create/list/update
  - meter create/list/update/externalId lookup
  - reading insert and duplicate detection
  - usage aggregate replace/list
  - alert rule/event create/list/update
- [ ] Install dependencies and refresh lockfile.
- [ ] Add database schema typing and row mapper helpers.
- [ ] Implement migration runner.
- [ ] Implement PostgreSQL persistence methods.
- [ ] Update API services to inject the abstraction.
- [ ] Update `seed-demo.ts` and `DemoSeedService` to use PostgreSQL persistence.
- [ ] Update local/kubernetes docs for real migration behavior.

**Acceptance:**

- API data persists across server restarts.
- `pnpm --filter @iot-management/api db:migrate` applies migrations and is safe to rerun.
- Existing API e2e tests pass against PostgreSQL.
- Demo seed is idempotent.
- No dashboard UI rewrite occurs in this phase.

**Manual verification:**

1. Start local PostgreSQL.
2. Run `pnpm --filter @iot-management/api build`.
3. Run `pnpm --filter @iot-management/api db:migrate` twice.
4. Run `pnpm --filter @iot-management/api seed:demo` twice.
5. Start API, login, create a building, restart API, and confirm the building remains.

---

## Phase 2: Secure Session Auth

**Goal:** Replace prototype/localStorage authentication with real API-backed HTTP-only cookie sessions.

**Key design:**

- Add `sessions` table with hashed session token, user id, organization id, membership id, created time, expiry, revoked time, user agent, and IP.
- Login creates a server-side session and sets an HTTP-only cookie.
- Logout revokes the current session and clears the cookie.
- `GET /api/v1/auth/me` resolves current session and returns user, organization, membership, role, and permissions.
- Keep bearer token support only for tests or API clients if explicitly needed; dashboard uses cookie session.
- Add CSRF token endpoint and require CSRF header for cookie-authenticated mutations.

**API endpoints:**

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/csrf`

**Dashboard changes:**

- Replace localStorage session behavior.
- Add `SessionProvider` or server/client auth helper.
- Protect dashboard routes.
- Add account menu with Logout action.

**Implementation tasks:**

- [ ] Write failing e2e tests for login cookie, logout cookie clearing, protected route rejection, and session refresh.
- [ ] Add sessions migration and repository methods.
- [ ] Implement cookie helpers with secure production defaults.
- [ ] Implement CSRF token creation/validation for mutations.
- [ ] Update auth guard to accept session cookie.
- [ ] Update web login/logout flows.
- [ ] Update Playwright tests for real session behavior.

**Acceptance:**

- Unauthenticated dashboard users redirect to `/login`.
- Login persists after refresh.
- Logout removes access.
- Session cookie is HTTP-only.
- Role and organization come from API, not static demo data.

**Manual verification:**

1. Open `/dashboard` while logged out and confirm redirect to `/login`.
2. Login as `owner@north.example`.
3. Refresh `/dashboard` and confirm session remains.
4. Logout and confirm `/dashboard` redirects again.

---

## Phase 3: Password Management And Dev Outbox

**Goal:** Complete change-password, forgot-password, and reset-password flows with Dev outbox delivery.

**Key design:**

- Add `password_reset_tokens` table.
- Add `email_outbox` table.
- Reset tokens are random, hashed at rest, single use, and expire after 30 minutes.
- Forgot-password response is generic and never reveals whether an email exists.
- Password minimum length is 12 characters.
- Reject reuse of current password.
- Dev outbox is available only in development/test.

**API endpoints:**

- `POST /api/v1/auth/change-password`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/dev/email-outbox`

**Dashboard pages:**

- `/forgot-password`
- `/reset-password`
- `/settings/profile`
- `/settings/security`

**Implementation tasks:**

- [ ] Write failing API e2e tests for change, forgot, reset, expired token, reused token, and generic forgot response.
- [ ] Add password reset and outbox migrations.
- [ ] Add `EmailService` interface and `OutboxEmailService`.
- [ ] Add password policy helper.
- [ ] Add dashboard forms and validation states.
- [ ] Add Playwright tests for forgot/reset/change flows.

**Acceptance:**

- Forgot-password creates a Dev outbox email with reset link.
- Reset token cannot be reused.
- Expired token is rejected.
- Change-password works for authenticated users.
- Password flows do not leak account existence.

**Manual verification:**

1. Use `/forgot-password` with `owner@north.example`.
2. Inspect Dev outbox endpoint in local/test mode.
3. Open reset link and set a new password.
4. Login with new password.
5. Confirm old password fails.

---

## Phase 4: Invitations, Users, Memberships, And Roles

**Goal:** Make organization user management and role enforcement production-shaped.

**Key design:**

- Add `invitations` table with hashed token, email, role, organization id, inviter id, expiry, accepted time, revoked time.
- Owners can invite and manage all roles.
- Managers can invite viewers only.
- Viewers cannot invite or manage users.
- Prevent removing or downgrading the last active owner.
- Record audit logs for invite, accept, role change, disable, and reactivate.

**API endpoints:**

- `GET /api/v1/memberships`
- `POST /api/v1/invitations`
- `GET /api/v1/invitations/:token`
- `POST /api/v1/invitations/accept`
- `PATCH /api/v1/memberships/:membershipId`
- `POST /api/v1/memberships/:membershipId/disable`
- `POST /api/v1/memberships/:membershipId/reactivate`

**Dashboard pages:**

- `/settings/users`
- invitation acceptance page

**Implementation tasks:**

- [ ] Write failing role-matrix e2e tests for owner, manager, viewer.
- [ ] Add invitation and membership status migrations.
- [ ] Implement invitation service and outbox email.
- [ ] Implement membership list/update/disable/reactivate.
- [ ] Add last-owner protection.
- [ ] Add settings users UI.
- [ ] Add Playwright user management tests.

**Acceptance:**

- Permission matrix is enforced by API and reflected in UI.
- Cross-tenant membership changes are impossible.
- Last owner cannot be removed or downgraded.
- Invitation acceptance is idempotent and token-safe.

**Manual verification:**

1. Owner invites manager and viewer.
2. Accept invitations from Dev outbox links.
3. Login as each role.
4. Confirm visible actions match role.
5. Try to downgrade the last owner and confirm rejection.

---

## Phase 5: Portfolio Relationship Completion

**Goal:** Complete building, floor, unit, and meter management with strict relationships.

**Relationship rules:**

- Organization owns buildings.
- Building owns floors.
- Building owns units.
- Unit optionally belongs to one floor in the same building.
- Meter belongs to one building.
- Meter optionally belongs to one floor and/or one unit in the same building.
- Building-shared meters have no unit.
- Archived parent resources cannot accept new child resources.

**API behavior:**

- Full CRUD plus archive/restore for buildings, floors, units, and meters.
- Detail endpoints return useful related child data.
- Server validates all relationship moves.
- Deleting is not physical delete; use archive status.

**Dashboard pages:**

- `/buildings`
- `/buildings/[buildingId]`
- `/units`
- `/units/[unitId]`
- `/meters`
- `/meters/[meterId]`

**Implementation tasks:**

- [ ] Write failing API e2e tests for relationship validation and archive/restore.
- [ ] Add archive fields and uniqueness constraints.
- [ ] Add detail query endpoints.
- [ ] Add create/edit/archive/restore services.
- [ ] Add UI forms that only show valid parent choices.
- [ ] Add detail pages with related meters, usage, alerts, and status.
- [ ] Add Playwright tests for create/edit/archive/detail flows.

**Acceptance:**

- Invalid floor/unit/meter relationships are rejected server-side.
- UI prevents common invalid assignments.
- Archive/restore behavior is consistent.
- Detail pages expose operational context.

**Manual verification:**

1. Create a building, floor, unit, and unit meter.
2. Create a building-shared meter.
3. Attempt cross-building floor/unit assignment and confirm rejection.
4. Archive a building and confirm child creation is blocked.
5. Restore and confirm creation works again.

---

## Phase 6: Dashboard API Integration And UI Polish

**Goal:** Remove static dashboard fixtures and make the dashboard fully API-driven and polished.

**Key design:**

- Replace static data from `apps/web-dashboard/lib/api.ts` with API client calls.
- Add auth-aware API client helpers.
- Add reusable table, filter, dialog, empty, loading, error, and stale-data patterns.
- Keep shadcnblocks-inspired operational UI.
- Use role-aware actions and navigation.

**Dashboard areas:**

- Overview cards.
- Usage trend chart.
- Building breakdown.
- Unit rankings.
- Device health.
- Open alerts.
- Reports.
- Settings.

**Implementation tasks:**

- [ ] Write Playwright tests proving dashboard renders API data.
- [ ] Add API data loaders/hooks.
- [ ] Replace static imports page by page.
- [ ] Add loading/empty/error states.
- [ ] Add role-aware nav and actions.
- [ ] Add create/edit/archive dialogs for core resources.
- [ ] Run screenshot review for key desktop/mobile widths.

**Acceptance:**

- No production page depends on static demo arrays.
- Dashboard works from API data only.
- UI is responsive and visually consistent.
- Long names and empty states remain readable.

**Manual verification:**

1. Login and visit every sidebar page.
2. Confirm network/API data is used.
3. Toggle roles and confirm actions differ.
4. Check desktop and narrow viewport layouts.

---

## Phase 7: Alerts, Reports, Rates, And Operational Workflows

**Goal:** Complete day-to-day operational workflows for a building owner/manager.

**Key design:**

- Add organization utility rate settings.
- Cost estimates use configured rates.
- Alert rule CRUD persists in PostgreSQL.
- Alert lifecycle actions persist and write audit events.
- Monthly reports are generated from persisted readings and aggregates.
- JSON export first; CSV export next in same phase if low-risk.

**API endpoints:**

- Existing alerts endpoints remain.
- Add rate settings endpoints under `/api/v1/settings/rates`.
- Add report export endpoint under `/api/v1/reports/monthly-usage/export`.

**Dashboard pages:**

- `/alerts`
- `/reports`
- `/settings/rates`
- `/settings/demo-data`

**Implementation tasks:**

- [ ] Write API e2e tests for rates, alert lifecycle persistence, and report generation.
- [ ] Add rate settings migration.
- [ ] Update cost estimate service to use organization rates.
- [ ] Complete alert rule CRUD UI.
- [ ] Complete alert acknowledge/resolve UI.
- [ ] Complete report generation and export UI.
- [ ] Add role-aware demo data controls.

**Acceptance:**

- Reports reflect persisted readings.
- Alert state changes persist.
- Cost estimates use organization settings.
- Viewers can inspect but not mutate operational data.

**Manual verification:**

1. Change utility rates.
2. Seed readings and generate report.
3. Confirm costs change.
4. Create alert rule and evaluate alerts.
5. Acknowledge and resolve an alert.

---

## Phase 8: Rich Demo Data And Test Fixtures

**Goal:** Make local testing and product review feel realistic.

**Seed data shape:**

- 2 organizations.
- 3 buildings.
- Multiple floors.
- 40 units.
- Water and electric meters.
- Building-shared meters.
- 90 days of readings.
- Stale/offline meters.
- Alert rules and alert events.
- Owner, manager, viewer users.

**Commands:**

- `pnpm seed:demo`
- `pnpm --filter @iot-management/api seed:demo`
- optional local-only reset command: `pnpm --filter @iot-management/api seed:reset-demo`

**Implementation tasks:**

- [ ] Write seed idempotency e2e tests.
- [ ] Add deterministic fixture constants.
- [ ] Expand `DemoSeedService`.
- [ ] Add local-only demo reset command.
- [ ] Update Playwright fixtures to rely on stable seeded data.
- [ ] Update docs with demo account list.

**Acceptance:**

- Rerunning seed does not duplicate data.
- Fresh local environment becomes useful quickly.
- Dashboard looks populated and realistic.
- E2e tests use stable fixture IDs.

**Manual verification:**

1. Drop/recreate local database or start a clean one.
2. Run migrations.
3. Run seed twice.
4. Login as owner, manager, viewer.
5. Confirm dashboard has rich data and no duplicates.

---

## Phase 9: Security, Audit, And Production Hardening

**Goal:** Apply product-grade security and auditability across the core product.

**Key design:**

- Add `audit_log` table and service.
- Add request IDs.
- Add structured logs with redaction.
- Add stricter rate limits for login, forgot password, reset password, invitations, and ingestion.
- Add security headers through Nest and Next configuration where appropriate.
- Add OpenAPI docs for REST endpoints.
- Add centralized error coverage for all modules.

**Audit event categories:**

- auth login/logout/session revoked
- password changed/reset requested/reset completed
- invitation created/accepted/revoked
- membership role changed/disabled/reactivated
- building/floor/unit/meter created/updated/archived/restored
- reading ingestion rejected/accepted summary events where appropriate
- alert acknowledged/resolved
- report generated/exported
- settings changed

**Implementation tasks:**

- [ ] Write security regression tests for redaction, rate limits, and audit events.
- [ ] Add audit migration and service.
- [ ] Add request id middleware.
- [ ] Add logger redaction.
- [ ] Add OpenAPI setup.
- [ ] Add security headers.
- [ ] Add audit UI under settings for owner/manager if low-risk; otherwise API only.

**Acceptance:**

- No auth token, reset token, password, or secret is logged.
- Security regression suite passes.
- API errors are consistent.
- Audit logs answer who changed what and when.

**Manual verification:**

1. Perform login, password change, invite, building update, and alert resolve.
2. Query audit log endpoint or database.
3. Confirm actor, organization, action, target, and timestamp exist.
4. Confirm logs do not contain secrets.

---

## Phase 10: Deployment Verification With Real Product Core

**Goal:** Ensure local, Docker, and Kubernetes deployment paths work after the product core becomes database-backed.

**Key design:**

- API Docker image includes real migration and seed commands.
- Kubernetes migration Job runs the real migration runner.
- Health checks verify API and database connectivity.
- Local docs explain migrate, seed, login, and dashboard verification.

**Implementation tasks:**

- [ ] Update Dockerfiles if new runtime dependencies require changes.
- [ ] Update Kubernetes migration Job command if needed.
- [ ] Update ConfigMap/Secret docs for new auth/session env vars.
- [ ] Run Docker image builds.
- [ ] Run Kubernetes client dry-runs.
- [ ] Run compiled API smoke test against PostgreSQL.
- [ ] Update deployment docs.

**Acceptance:**

- `pnpm build` succeeds.
- API and web images build.
- Local Kubernetes dry-run passes.
- Migration Job is safe to rerun.
- Local deployment can start, migrate, seed, and serve dashboard.

**Manual verification:**

1. Build API/web images.
2. Apply local Kubernetes dry-run.
3. Run migration command.
4. Run seed command.
5. Start API and web.
6. Login and visit dashboard.

---

## Full Regression Commands

Run focused tests during each task. At each phase boundary, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @iot-management/api test:e2e
pnpm --filter @iot-management/web-dashboard test:e2e
kubectl apply --dry-run=client -k deploy/kubernetes/overlays/local
```

When a phase touches Docker or deployment, also run:

```bash
pnpm docker:build:api
pnpm docker:build:web
```

## Final Product Acceptance

- Core web SaaS can be used without static fixtures.
- Users can log in, log out, change password, reset password, invite users, and manage roles.
- Owners/managers can manage buildings, floors, units, meters, alert rules, reports, rates, and demo data.
- Viewers have read-only access.
- Data persists in PostgreSQL across restarts.
- Tenant isolation is tested across resource types.
- Dashboard is polished, responsive, and populated by realistic seed data.
- Local and Kubernetes deployment paths are documented and verified.

## Deferred Until After Core Completion

- Phase 13 mobile app.
- Phase 14 real device integration.
- Tenant-facing portal.
- Billing/subscriptions.
- Production email provider integration beyond the Dev outbox interface.
