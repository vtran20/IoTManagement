# Product Experience Audit

Date: 2026-07-05

## Scope

Owner workflow audited with the locally running dashboard: sign-in, overview,
incidents, alerts, repair work orders, and vendor directory. Evidence is in
`screenshots/` beside this report.

## Evidence Steps

1. **Dashboard (`01-dashboard.png`) - healthy, with important polish gaps.**
   The desktop shell, navigation, metric hierarchy, charts, and unit ranking
   table are legible and feel like an operational product.
2. **Incidents (`02-incidents.png`, `03-incidents-desktop.png`) - capture
   invalid.** The saved image shows a narrow column, but the live 1440px page
   measured a 1190px workspace and 1142px full-width panels with desktop media
   queries inactive. Do not use these images as layout evidence.
3. **Work orders (`04-work-orders.png`) - capture invalid.** The screenshot
   has the same inconsistency and is retained only to document the capture
   limitation.
4. **Alerts (`05-alerts.png`) - capture invalid.** The image cannot support a
   conclusion about form or table reflow.
5. **Vendors (`06-vendors.png`) - capture invalid.** The image cannot support
   a conclusion about form density or desktop width.

## Strengths

- The overview makes utility health, usage, estimated cost, and unit rankings
  easy to scan.
- The left navigation and page naming are consistent across the product.
- The response model is understandable: alert, incident, work order, vendor,
  completion cost.
- Loading, empty, error, stale-data, and read-only states exist in the source
  for many primary data surfaces.

## Findings

### P1 - Make top-bar controls real or remove them

Search and Export appear on every route, but currently communicate availability
without showing a route-specific search field, export target, or disabled-state
explanation. This erodes trust in an operational tool.

**Fix:** implement global command/search only when it can search current data;
otherwise show it only on supported pages. Replace generic Export with explicit
commands such as `Export incidents CSV` and place them in the relevant page
header.

### P1 - Correct dashboard metric and chart semantics

The fifth metric, Overdue Work, wraps inside a four-column strip and creates a
large empty region. Alert and overdue cards also show the same `+8.4% vs last
month` change text as utility usage, which is misleading. The usage chart's
x-axis repeats `Jun` rather than showing a meaningful date range.

**Fix:** make metric-card layout responsive to the actual card count; use
status-oriented support text for alerts and work orders; compute or remove
change indicators; use distinct, correctly formatted period labels.

### P1 - Make response tables action-first and responsive

The most urgent work needs prominence: severity, owner/vendor, age, SLA/due
state, and the next action should remain visible together. Current incident,
alert, and work-order tables expose the necessary data but do not yet establish
one consistent response-oriented hierarchy.

**Fix:** add consistent priority/status chips, age/due-state indicators, a
single primary next action, and horizontally scrollable table containers on
narrow screens. For mobile, render each item as an action-oriented list row,
not a squeezed desktop table.

### P2 - Improve form flow and validation feedback

Forms should show field-level requirements and success feedback near the
submitted action. Desktop density and collision claims require a validated
cross-browser screenshot run.

**Fix:** use a two-column desktop form only after the layout defect is fixed;
keep one column on mobile; reserve action space; show inline validation and a
success toast/confirmation with the created record name.

### P2 - Clarify the operating flow

The product has the right entities, but the entry points are distributed:
operators start in Alerts or Incidents, then create and assign work in separate
surfaces. The dashboard should make the daily queue obvious.

**Fix:** add an `Operations today` area with open critical alerts, unassigned
incidents, overdue work, and recently resolved incidents; link every item to a
detail view with a clear next action.

## Accessibility Risks

- Screenshots show table headers and values wrapping at character boundaries,
  making information difficult to read and likely difficult to navigate with
  zoom.
- Small muted labels and fine borders need contrast testing against the white
  and light-gray surfaces.
- Icon-only or generic controls need verified accessible names and visible focus
  states. The visible Menu control has a label, but keyboard focus, focus trap,
  and escape behavior still require automated testing.
- Table-to-list responsive behavior, keyboard sorting/filtering, and live
  announcement of mutation success/error were not verified from screenshots.

## Technical and Quality Recommendations

1. Add Playwright visual regression coverage for Dashboard, Incidents, Alerts,
   Work Orders, Vendors, and a representative detail page at 1440px, 1024px,
   and 390px.
2. Add workflow e2e tests for owner, manager, and viewer: alert-to-incident,
   work assignment, completion, and overdue notification read state.
3. Establish a shared TanStack Query policy for retry, stale time, invalidation,
   optimistic updates, and mutation error messages. Current feature-level usage
   is inconsistent.
4. Add route-level performance telemetry for list/detail endpoints and record
   client fetch timing, then define a dashboard interaction budget.
5. Treat generated UI files such as `next-env.d.ts` as build output in local
   workflows so production builds do not create distracting working-tree noise.

## Recommended Improvement Order

1. **P0 Visual QA Reliability:** add reliable browser screenshot coverage for
   desktop, tablet, and mobile before acting on visual claims.
2. **P1 Operational Clarity:** action-first tables, correct dashboard metrics,
   and route-specific search/export behavior.
3. **P2 Flow Completion:** inline validation, confirmation feedback, and an
   Operations Today queue.
4. **Quality Guardrails:** role workflow e2e tests, accessibility checks, and
   performance instrumentation.

## Evidence Limits

This audit used a local seeded owner session. The dashboard screenshot was
accepted, but non-dashboard browser captures conflicted with live DOM layout
measurements and were rejected as visual evidence. It did not run a
screen-reader audit, keyboard-only traversal, a live production performance
test, device/browser compatibility testing, or external-vendor communication
flows.
