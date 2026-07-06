# Core API Test Phase 1 Design

Date: 2026-07-05
Status: Approved for implementation planning

## Goal

Increase regression confidence in the highest-risk Smart Utilities API behavior
without adding shallow tests for DTOs, Nest module wiring, generated files, or
simple transport adapters. Each production behavior covered in this phase must
have focused unit coverage and a regression test at the API boundary when it
spans authorization, persistence, or multiple services.

## Scope and Order

1. Work orders: lifecycle transitions, assignee eligibility, owner/manager/viewer
   permissions, overdue state, audit/timeline effects, required completion note,
   and optional `finalCost`.
2. Tenant and access: authentication, memberships, and invitations, including
   role escalation and cross-organization denial.
3. Meter and reading integrity: meter lifecycle/health, reading validation,
   idempotency, immutable accepted readings, and tenant scope.
4. Alerts and incidents: alert rule/event behavior, lifecycle actions, leak
   incidents, and leak-detection policy behavior.
5. Analytics and reports: aggregation, cost calculation, usage queries, monthly
   report data, and exports.

## Testing Design

- Unit tests target service decision logic with narrow persistence and dependency
  doubles. They assert rules and observable requests/results instead of private
  implementation details.
- API e2e regressions use the existing isolated PostgreSQL schema setup. Add a
  regression test only where a behavior crosses API validation, authorization,
  persistence, or multiple services; retain existing coverage where it already
  protects the workflow.
- Work-order completion requires a non-empty completion note. `finalCost` remains
  optional, so completion with a note and no final cost must return success.
- Tests run serially where shared demo fixtures or lifecycle state are involved;
  otherwise unit tests remain fast and independent.

## Completion Criteria

- Each scoped service has focused unit tests for its highest-risk decisions.
- The work-order e2e failure is replaced by the agreed optional-cost regression.
- Existing tenant-isolation, ingestion, alert lifecycle, and reporting e2e tests
  remain passing, with new tests only for unprotected critical behavior.
- `pnpm test`, `pnpm --filter @iot-management/api test:e2e`, `pnpm lint`, and
  `pnpm typecheck` are run before handoff. The local `qa:fast` gate is run after
  its API e2e prerequisite passes.
