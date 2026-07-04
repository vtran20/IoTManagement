# Operational Detail Breadcrumbs Design

Date: 2026-07-04
Status: Approved for implementation planning

## Purpose

Give property managers dependable context and parent navigation while viewing a
specific operational record, without adding breadcrumb noise to dashboard and
list pages.

## Scope

Show breadcrumbs only on the existing detail pages:

- Building detail: `Buildings / <Building name>`
- Unit detail: `Buildings / <Building name> / <Unit name>`
- Meter detail: `Meters / <Meter label>`
- Incident detail: `Incidents / <Incident title>`

Do not add breadcrumbs to dashboards, list pages, reports, alert lists, or
settings pages in this pass. Future work-order detail pages may use the same
component with `Work Orders / <Work order title>`.

## Interaction And Accessibility

- Every ancestor is a normal link; the current record is plain text with
  `aria-current="page"`.
- Labels use API-backed names. A missing parent name renders a readable
  fallback such as `Unknown building`; no raw IDs are exposed as breadcrumb
  labels.
- The breadcrumb appears above the page heading within the existing detail
  header and wraps gracefully on narrow screens.
- Separators are decorative and hidden from assistive technology.

## Component Design

Add a shared `Breadcrumbs` component that accepts a small ordered array of
`{ label, href? }` items. The last item is always the current page and is not
rendered as a link. It owns only breadcrumb presentation; each detail screen
continues to own its data lookup and decides its hierarchy.

## Testing

- Unit-test breadcrumb markup for ancestor links and a current-page item.
- Add focused source/layout coverage for each detail view using the shared
  component.
- Run dashboard lint, typecheck, unit tests, and production build.
- Manually verify desktop and mobile breadcrumb wrapping after the active
  development server reloads.
