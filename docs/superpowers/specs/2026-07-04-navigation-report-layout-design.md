# Navigation Selection And Report Layout Design

Date: 2026-07-04
Status: Approved for implementation planning

## Purpose

Make the dashboard's current operational area obvious in both desktop and mobile
navigation, and repair the Leak Response Report layout so it uses the available
dashboard workspace instead of collapsing into narrow grid cells.

## Navigation Selection

The active navigation item is derived from the current pathname.

- A navigation item is active for its exact route and every nested detail route.
- `/buildings` and `/buildings/<buildingId>` activate Buildings.
- `/incidents` and `/incidents/<incidentId>` activate Incidents.
- `/work-orders` activates Work Orders.
- The same rule applies to Dashboard, Units, Meters, Alerts, Reports, and
  Settings.
- Only one item is active at a time.
- The matching link receives the existing `active` visual treatment and
  `aria-current="page"`.
- Desktop sidebar and mobile navigation use the same `Nav` component and
  therefore share the exact behavior.

## Report Layout

The dashboard workspace is a 12-column grid. The Leak Response Report's root
section must explicitly span all workspace columns.

- Add a dedicated report-root class to the Leak Response Report.
- The report root spans `grid-column: 1 / -1` in the dashboard workspace.
- Its existing report summary and two-column report grid retain their desktop
  layouts.
- The existing mobile breakpoint continues to collapse the report grid to one
  column.
- No report data, API shape, export behavior, or report calculations change.

## Testing

- Add unit coverage for exact and nested-route navigation matching.
- Add component/layout coverage confirming the Leak Response Report has its
  full-width root class.
- Run the dashboard lint, typecheck, unit tests, and production build.
- Run the existing dashboard browser tests when the active development server
  does not hold the Next build lock.

## Manual Verification

1. Visit `/buildings` and a building detail URL. Buildings is highlighted.
2. Visit `/incidents` and an incident detail URL. Incidents is highlighted.
3. Visit `/reports` on a desktop-width viewport. Leak Response Report uses the
   full content width, with summary metrics and report panels readable.
4. Visit `/reports` on a narrow viewport. The report panels stack without
   horizontal overflow.
