# Water Leak-to-Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tenant-safe water-incident workflow that turns simulated meter anomalies, future moisture sensors, and manual reports into auditable repair work.

**Architecture:** Keep generic `AlertEvent` records intact and add a separate `LeakIncident` aggregate for the human response lifecycle. PostgreSQL stores incidents, evidence, activities, work orders, notifications, policies, and future sensor events; NestJS exposes REST resources; the Next dashboard adds operational command-center views.

**Tech Stack:** NestJS 11, Kysely/PostgreSQL, Redis/BullMQ for later escalations, Next.js 16, React 19, TanStack Query, Vitest, Playwright.

---

## Delivery Order

### Phase 1: Incident Foundation

- [x] Add tenant-scoped `LeakIncident` and `IncidentActivity` schema, domain types, and persistence methods. `IncidentEvidence` arrives with automated detection in Phase 2.
- [x] Add manual incident creation, listing, details, acknowledgement, investigation, containment, monitoring, resolution, and note APIs.
- [x] Enforce the lifecycle `open -> acknowledged -> investigating -> contained -> monitoring -> resolved` and require a resolution category and note.
- [x] Create audit records and immutable activity entries for all mutations.
- [x] Cover tenant isolation, role access, transition validation, and migration safety with unit and PostgreSQL e2e tests.

### Phase 2: Meter-Based Detection

- [ ] Add continuous-flow detection policies scoped to organization, building, unit, or meter.
- [ ] Evaluate only valid water readings for the affected meter; ignore duplicate, invalid, and gapped intervals.
- [ ] Open one deduplicated incident per unresolved policy/resource pair and attach every matching reading window as evidence.
- [ ] Extend simulation with reproducible water-leak scenarios and calculate excess water and estimated cost.

### Phase 3: Repair Work Orders

- [ ] Add tenant-scoped work orders, assignment to active owner/manager memberships, status changes, due dates, and completion notes.
- [ ] Mirror work-order changes into the incident timeline and support filtering by assignee, priority, and overdue state.

### Phase 4: Water Operations Dashboard

- [ ] Add incident list, detail, and work-order dashboard routes with loading, empty, error, stale-data, and viewer read-only states.
- [ ] Link legacy leak alerts to incidents and show evidence, status actions, meter usage context, and repair history.

### Phase 5: Notifications And Escalation

- [ ] Add organization responder settings, in-app notification records, existing development-outbox email entries, and durable deduplication.
- [ ] Add a BullMQ escalation worker with critical and warning acknowledgement deadlines.

### Phase 6: Moisture Sensors And Correlation

- [ ] Add a simulated moisture-sensor registry and immutable normalized sensor events.
- [ ] Correlate sensor and meter evidence into a single incident when they share a resource context inside a configurable time window.

### Phase 7: Analytics And Reporting

- [ ] Add response-time, recurring-location, excess-water, and resolution-outcome analytics plus CSV/JSON/PDF leak reports.
- [ ] Add explainable, opt-in baseline detection only after 14 days of valid interval data.

## Cross-Phase Acceptance Criteria

- Every customer-owned record is filtered by the authenticated organization.
- Owner/manager actions are auditable; viewers remain read-only.
- Raw meter readings and sensor events are immutable after acceptance.
- Each phase includes focused unit tests, PostgreSQL e2e coverage where persistence changes, regression tests, and practical manual verification.
- Automatic/remote shutoff, real gateway protocols, SMS/push providers, resident workflows, and CMMS integrations require separate approved plans.
