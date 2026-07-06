# Dashboard Behavior Test Phase 2 Design

Date: 2026-07-06
Status: Approved for implementation planning

## Goal

Increase dashboard regression confidence for permission-sensitive forms and
data-state behavior without changing product behavior, API contracts, or the
existing visual design.

## Scope and Order

1. Permission and form workflows: settings users/invitations, utility rates,
   portfolio and meter management, alert actions, and work-order actions.
   Owners and managers retain permitted actions; viewers must see read-only
   interfaces and be unable to submit mutations.
2. Data states: add deterministic mocked API coverage for loading, error,
   empty, and stale-data states on the dashboard overview and the operational
   pages changed in this phase.
3. Real-stack browser coverage: keep a serial, small suite for three release
   journeys only: owner dashboard/report, manager operational change, and
   viewer read-only/report download.

## Test Design

- Reuse the existing Playwright mocked-route fixtures for dashboard behavior.
  Tests must assert user-observable controls and responses rather than
  implementation details such as React state or query-cache internals.
- Add focused Vitest tests only for pure data-state or permission helpers that
  are introduced or changed. Do not add production test hooks.
- Retain the API e2e suite as the definitive authorization and tenant-isolation
  proof. Dashboard tests prove that the UI does not expose or enable mutations
  a viewer cannot perform.
- Keep `playwright.config.ts` limited to mocked browser tests; the real-stack
  configuration continues to target `tests/real-stack/` and runs only through
  `pnpm qa:release`.

## Success Criteria

- Mocked Playwright coverage prevents a viewer from using permission-sensitive
  forms or lifecycle actions and proves owner/manager actions remain usable.
- Each selected page has an explicit loading, error, empty, or stale-data
  assertion where that state is meaningful to the operator.
- The real-stack suite covers the three defined role journeys serially, without
  API route mocking.
- `pnpm qa:fast` and `pnpm qa:release` remain separated: fast runs mocked
  browser tests only; release runs the real temporary stack and its browser
  journeys.
