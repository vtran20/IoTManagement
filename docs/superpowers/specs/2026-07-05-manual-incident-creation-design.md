# Manual Incident Creation Design

Date: 2026-07-05
Status: Approved

## Purpose

Give owners and managers a clear way to record a water incident reported by a resident, technician, or inspection when no alert event is involved. The existing alert-to-incident workflow remains unchanged.

## Chosen Experience

The Incidents page will gain an owner/manager-only `Create incident` action. Selecting it reveals a compact, in-page form using the dashboard's existing `data-panel`, field, and primary-button styles. This is preferred over a modal because operators can review the current queue while entering the report, and over a dedicated route because the form is short and incident handling continues on the detail page.

The form collects:

- Building (required)
- Unit (optional; limited to the selected building)
- Meter (optional; limited to the selected building)
- Severity (required; defaults to `warning`)
- Title (required)
- Description (required)

On successful submission, the dashboard navigates to the new incident detail page so the operator can immediately acknowledge, investigate, add notes, and create a work order. A cancel action closes the form without changing queue data.

## Data And Security

The dashboard will call the existing `POST /api/v1/incidents/manual` endpoint. It already derives organization scope from the authenticated membership and permits only owners and managers. The dashboard will hide mutation controls for viewers; this is a usability measure, not the authorization boundary.

The form retrieves only tenant-scoped buildings, units, and meters through the existing REST endpoints. Filtering dependent options in the UI prevents accidental mismatches; the API retains the final relationship validation.

## Errors And States

- While the form's context data loads, show a concise loading state.
- If context data cannot load, show an actionable error and do not submit incomplete context.
- Validation uses native required controls for the required fields.
- A failed creation shows a short inline error and preserves the entered data.
- The incident table keeps its current loading, error, stale, and empty states.

## Testing

- Add focused dashboard coverage that proves an owner can open the form and create a manual incident.
- Verify the submission sends the selected scoped context and navigates to the created incident.
- Verify viewers do not receive the create action.
- Preserve API e2e coverage for manual incident creation and tenant/context validation.

## Non-Goals

- No automatic incident creation from alerts.
- No changes to the existing alert-to-incident correlation path.
- No new API endpoint, schema migration, roles, or notification behaviour.
