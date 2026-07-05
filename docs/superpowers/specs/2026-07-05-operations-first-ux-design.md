# Operations First UX Design

Date: 2026-07-05

Status: Approved for implementation planning

## Purpose

Make the dashboard useful for the first question a property manager asks at the
start of a workday: what needs attention now? The current product already has
alerts, leak incidents, repair work orders, device health, usage analytics, and
role restrictions. This work reorganizes those real capabilities into a clear
operational starting point without introducing automated incident creation,
global search, bulk actions, or new device behavior.

The visual direction remains the existing calm, monochrome admin dashboard:
left navigation, slim top bar, compact bordered panels, small Lucide icons, and
rounded corners no larger than the existing 8px system.

## User Outcomes

- Owners and managers can immediately see urgent response work and open the
  correct detail screen in one click.
- Viewers can assess operational status without seeing controls that imply they
  can mutate data.
- Usage and cost analysis remain available, but no longer compete with urgent
  repair and safety work at the top of the dashboard.
- Dashboard labels never imply data that the API does not calculate.
- The same screen remains readable at 1440px desktop, 1024px tablet, and 390px
  mobile widths.

## Scope

### Dashboard Information Hierarchy

The Overview screen is ordered as follows:

1. **Operational summary**: four truthful, live metrics.
2. **Operations Today**: a compact priority queue with direct destinations.
3. **Utility analytics**: existing usage/cost trend, building breakdown, and
   unit ranking panels.

The operational metric labels and definitions are:

| Metric | Definition | Primary destination |
| --- | --- | --- |
| Critical alerts | Alert events whose status is `open` and severity is `critical` | `/alerts` |
| Incidents without repair | Non-resolved water incidents with no related work order in `open`, `assigned`, or `in_progress` status | `/incidents` |
| Overdue work | Assigned or in-progress work orders whose `dueAt` has passed | `/work-orders?overdue=true` |
| Devices offline | Meters whose calculated health status is `offline` | `/meters` |

The metric formerly described as “Unassigned incidents” is deliberately named
**Incidents without repair**. The system has no incident-owner field today; an
incident can be actively investigated without a repair work order, so the new
label is accurate and actionable.

### Operations Today Queue

The new queue is a read-only triage surface, capped at eight items. It contains
only entries that require a follow-up and routes the user to the appropriate
existing workflow. It does not expose mutation buttons from the dashboard.

Each queue item returns:

- `kind`: `work_order`, `incident`, `alert`, or `meter`
- stable public `id`
- `title` and concise supporting text
- severity or priority where available
- current status
- due or detected time
- assignment summary for work orders: `Vendor`, `Internal`, or `Unassigned`
- `isOverdue` where applicable
- `href` and a short, explicit `actionLabel`

Queue precedence and deduplication rules:

1. Overdue active work orders rank first, then other critical work orders.
2. Active incidents without a repair work order rank next, critical before
   warning and then by oldest detection time.
3. Open, unlinked alerts rank next, critical before warning and then by oldest
   trigger time. Alerts already linked to an incident do not add a duplicate
   queue item.
4. Offline meters rank last, ordered by longest time without a reading.
5. A work order takes precedence over its incident. The queue therefore
   represents the next useful destination, not every related record.

Examples of action labels are `Review repair`, `Open incident`, `Review alert`,
and `Inspect meter`. A user opens the record first, then uses the existing,
role-protected controls on that record page.

### Dashboard API

Add a read-optimized authenticated endpoint:

```text
GET /api/v1/dashboard/operations
```

It derives organization scope exclusively from the authenticated request
context. It returns one `DashboardOperationsResponse` with generated time,
the four counts, and the capped queue. It must not accept a client-supplied
organization ID.

The service composes existing organization-scoped persistence queries for
alert events, incidents, work orders, and device health. No database migration
is required for this phase. The endpoint uses bounded result sets, deterministic
sorting, and a dashboard timing log entry following the existing dashboard
timing interceptor pattern.

The Overview client fetches `/dashboard/overview` and `/dashboard/operations`
in parallel. Each section owns its loading, empty, error, and stale-data state:
an unavailable operational queue must not hide still-valid usage analytics, and
vice versa.

### Existing Analytics

The current usage, cost, device-health, building-breakdown, and unit-ranking
panels remain below Operations Today.

- The trend card labels its reporting period from `overview.range`, for example
  `Last 30 days`, rather than a generic “Current period.”
- The hard-coded `+8.4% vs last month` text is removed.
- A comparison is shown only where `comparisonPercent` is actually supplied by
  the API. Otherwise, the card uses a neutral period/support label.
- Metric layout supports exactly four operational cards in the new top strip;
  this removes the existing five-card wrap ambiguity.

### Application Controls

`AppShell` receives an optional route-action slot instead of rendering global
placeholder controls.

- Remove global Search because no cross-product search exists.
- Remove global Export because no universal export action exists.
- Keep report download links on the Reports page, where their endpoints are
  already functional.
- Future page actions must be passed explicitly by the route and must be
  functional, role-safe, and accessible.

### Tables, Forms, And Role Behavior

Use shared, compact presentation primitives for severity, priority, lifecycle
status, and overdue state. They must reserve space and wrap/stack their action
controls rather than relying on fixed-width cells.

- Owners and managers continue to see mutations only in the existing alerts,
  incidents, vendors, and work-order workflows.
- Viewers can see summary counts and queue entries, but do not see dashboard
  actions suggesting changes they cannot perform.
- Existing error and success messages remain inside their panel or form,
  occupy the full appropriate grid span, and never collapse into a narrow
  action column.

## Responsive Requirements

| Viewport | Expected behavior |
| --- | --- |
| Desktop, 1440px | Sidebar visible; four metric cards in one row; queue shows context and action columns. |
| Tablet, 1024px | Mobile navigation trigger replaces sidebar; metrics form a two-by-two grid; queue retains useful columns or wraps within its own panel. |
| Mobile, 390px | Drawer navigation is reachable; metrics stack; queue/table can scroll only within its bordered container; no body-level horizontal overflow. |

The responsive work preserves current accessible mobile drawer behavior:
trigger, Escape, backdrop click, and route navigation close the drawer. Long
record titles, vendor names, and action labels must wrap without overlapping
status labels or buttons.

## Error Handling And Accessibility

- Each dashboard section announces loading and error state using the existing
  state-panel language and visible recovery context.
- Cached results show the existing stale-data cue without presenting stale data
  as current.
- Metric cards and queue destinations are semantic links with accessible labels.
- Status is not communicated by color alone; text labels remain visible.
- Table containers preserve keyboard access and intentional horizontal scrolling
  at narrow widths.

## Security And Tenant Isolation

- `/dashboard/operations` is protected by the existing `AuthGuard`.
- All source records are filtered by authenticated `organizationId` inside the
  dashboard service and persistence layer.
- The response never exposes cross-tenant titles, assignments, costs, or
  identifiers.
- The endpoint is read-only for owner, manager, and viewer roles.
- Existing mutation APIs and role guards remain unchanged.

## Explicitly Deferred

- Global search or command palette
- Dashboard bulk actions
- Automatic alert-to-incident creation
- Incident-owner data model and assignment workflow
- New notification channels, email, SMS, or vendor portal behavior
- Analytics comparison calculations where the source data does not yet provide
  them

## Test Strategy

### API

- Unit-test classification, precedence, duplicate suppression, metric count,
  overdue calculation, and deterministic queue ordering.
- Add API e2e coverage for organization isolation, viewer read access, and the
  invariant that linked alerts do not duplicate their incident/work-order path.
- Confirm dashboard timing logs identify the new endpoint without recording
  sensitive values.

### Dashboard

- Component tests cover accurate metric support copy, loading/error/stale/empty
  states, action-label/href rendering, and absence of fake change percentages.
- Playwright tests cover role-safe read-only presentation and route navigation
  from every operation type.
- Add viewport checks at 1440px, 1024px, and 390px for sidebar/drawer behavior,
  metric grid shape, action wrapping, and no document-level horizontal overflow.
- Retain existing reports-export test coverage so moving/removing shell controls
  cannot regress real report downloads.

## Acceptance Criteria

- The Overview page makes current response work visible before usage analytics.
- Every operational metric and queue label has an explicit, implemented data
  definition.
- No non-functional Search or Export controls remain in the global shell.
- No hard-coded performance or comparison claim remains in dashboard metrics.
- Queue destinations work for alert, incident, work-order, and meter items.
- All organization-owned data remains tenant-scoped.
- Dashboard and operations views remain usable at desktop, tablet, and mobile
  target widths.
- Existing alerts, incidents, work orders, report downloads, and viewer
  restrictions continue to work.
