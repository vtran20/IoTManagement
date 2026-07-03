# Moisture Sensor Correlation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tenant-safe simulated moisture sensors, immutable event ingestion, and 30-minute resource-first correlation with existing meter-anomaly incidents.

**Architecture:** Keep sensor registry/event storage separate from raw meter readings. `MoistureSensorsService` owns validation, idempotent event acceptance, and incident selection; `LeakIncidentsService` continues to own lifecycle mutations. A dedicated sensor-evidence link preserves raw event immutability while enriching the existing incident detail response.

**Tech Stack:** NestJS 11, Kysely/PostgreSQL, shared TypeScript API types, Vitest, Supertest.

---

### Task 1: Shared Contract And Migration

**Files:**
- Create: `apps/api/db/migrations/0016_moisture_sensor_correlation.sql`
- Modify: `packages/types/src/domain.ts`, `packages/types/src/api.ts`, `apps/api/src/database/schema.ts`
- Test: `apps/api/test/migrations.e2e-spec.ts`

- [ ] Write migration/contract assertions for the sensor registry, immutable events, evidence links, and settings defaults.
- [ ] Run the failing migration test.
- [ ] Add types/schema/migration with organization foreign keys, unique sensor event timestamps, and indexes for correlation lookup.
- [ ] Run migration and type checks.

### Task 2: Persistence And Correlation Service

**Files:**
- Modify: `apps/api/src/persistence/persistence.service.ts`, `apps/api/src/persistence/in-memory-persistence.service.ts`, `apps/api/src/persistence/postgres-persistence.service.ts`
- Create: `apps/api/src/moisture-sensors/moisture-sensors.service.ts`, `apps/api/src/moisture-sensors/moisture-sensors.service.spec.ts`

- [ ] Write failing unit tests for exact unit/building resource matching, the 30-minute boundary, dry-event no-op behavior, and new-incident fallback.
- [ ] Run the unit test and confirm the missing-service failure.
- [ ] Implement minimal tenant-scoped persistence and the correlation service.
- [ ] Re-run focused tests.

### Task 3: REST API, Incident Detail, And OpenAPI

**Files:**
- Create: `apps/api/src/moisture-sensors/moisture-sensors.controller.ts`, `apps/api/src/moisture-sensors/moisture-sensors.module.ts`, DTO files
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/incidents/leak-incidents.service.ts`, `apps/api/src/openapi/openapi.controller.ts`, `packages/api-client/src/endpoints.ts`
- Test: `apps/api/test/moisture-sensors.e2e-spec.ts`, `packages/api-client/src/index.test.ts`

- [ ] Write failing API tests for owner/manager writes, viewer read-only access, tenant isolation, idempotent ingestion, correlation, and OpenAPI paths.
- [ ] Implement controllers, guards, audit entries, incident detail evidence, and typed client calls.
- [ ] Run focused API and client tests.

### Task 4: Regression, Documentation, And Checkpoint

**Files:**
- Modify: `docs/superpowers/plans/2026-07-02-water-leak-to-resolution.md`

- [ ] Run API unit tests, focused PostgreSQL e2e tests, lint, typecheck, build, and Kubernetes manifest dry-run.
- [ ] Record the completed Phase 6 roadmap items.
- [ ] Review the diff and commit the phase checkpoint.
