# Alert-Incident Correlation Design

## Summary

Add an operator-controlled connection between alert events and water-leak incidents. Alerts remain signals that require review. Owners and managers may create a new incident from an alert or link the alert to an existing incident. The system must never open an incident automatically from an alert.

Manual incident creation remains available for tenant reports, visual inspections, and any other operational issue that did not begin with an alert.

## Goals

- Preserve the distinction between alert signals and managed incident cases.
- Let an owner or manager deliberately create an incident from an alert.
- Let an owner or manager link an alert to an existing non-resolved incident.
- Show relationships in both operational views.
- Preserve strict organization isolation and independent alert and incident lifecycles.

## Non-Goals

- Do not automatically create incidents from any alert condition or severity.
- Do not automatically resolve, acknowledge, or otherwise change a related record's lifecycle.
- Do not replace the existing manual incident endpoint.
- Do not build many-to-many alert-to-incident relationships in this phase.
- Do not add bulk correlation, external ticketing synchronization, or alert-rule escalation policies.

## Domain Model

`AlertEvent` gains an optional `incidentId` field. This makes the relationship one incident to many alerts:

- An alert event has zero or one linked incident.
- An incident may have zero or more linked alert events.
- An alert can be linked only to an incident in the same organization.
- A link may target only an incident whose status is not `resolved`.
- Existing alerts and incidents remain valid with no relationship.

The relationship is stored on the alert because an alert is evidence that may be attached to a longer-running incident. It avoids a join table while preserving the useful operational case: several alert events can support one repair investigation.

## User Workflows

### Create an incident from an alert

1. An owner or manager opens an unlinked alert on the Alerts page.
2. They choose **Create incident**.
3. The dashboard displays a compact form prefilled with the alert title and message. The user selects the building and may select a unit or meter when known, then confirms severity and details.
4. The API creates a standard `LeakIncident` with source `manual_report` and links the initiating alert in one transaction.
5. The new incident appears as the alert's related incident and opens in the normal incident workflow.

### Link an alert to an existing incident

1. An owner or manager opens an unlinked alert.
2. They choose **Link existing incident**.
3. The dashboard presents non-resolved incidents from the current organization.
4. The user selects one and confirms.
5. The API links the alert and returns the updated alert.

### Review a relationship

- The Alerts table displays a related-incident link when `incidentId` exists.
- The Incident detail page has a Related alerts panel with title, severity, alert status, triggered time, and links to Alerts.
- Viewers may see all relationship data but cannot create or change links.

## API Design

All endpoints remain under `/api/v1`, use the authenticated membership to derive organization scope, and require `owner` or `manager` for mutations.

### Create and link

`POST /api/v1/alerts/:alertId/incidents`

Request body extends the existing manual incident creation fields. The API derives the organization from the session and creates an incident plus its alert link atomically.

Response: the newly created incident, including the initiating alert relationship.

Validation:

- Alert must exist in the current organization.
- Alert must not already have an `incidentId`.
- Building, unit, and meter must belong to the current organization.
- Unit and meter must belong to the supplied building when present.

### Link existing

`POST /api/v1/alerts/:alertId/link-incident`

Request body:

```json
{ "incidentId": "incident_123" }
```

Response: updated alert event.

Validation:

- Alert and target incident must both belong to the current organization.
- Alert must be unlinked.
- Target incident must not be resolved.

### Query enrichment

- `GET /api/v1/alerts` returns related-incident summary data when an alert is linked, so the table does not need a request per row.
- `GET /api/v1/incidents/:incidentId` returns `relatedAlerts`, scoped to the same organization.
- Existing response fields and lifecycle endpoints remain compatible.

## Persistence And Audit

- Add nullable `incident_id` to `alert_events` with an index for incident-detail queries.
- Add a foreign key from `alert_events.incident_id` to `leak_incidents(id)`; organization checks remain mandatory at the service layer.
- The create-from-alert operation creates the incident, links the alert, creates the standard incident activity, and writes audit records in one database transaction.
- Linking an existing incident writes an `alert.linked_to_incident` audit event.
- Creating from an alert writes both the established manual-incident audit event and `alert.linked_to_incident` audit event.
- The API does not unlink alerts in this phase. Correction remains an explicit future workflow to avoid losing incident evidence.

## Lifecycle Rules

Alert lifecycle and incident lifecycle are intentionally independent:

- Acknowledge or resolve an alert without changing the related incident.
- Acknowledge, investigate, contain, monitor, or resolve an incident without changing related alerts.
- A resolved alert may remain linked to an active incident as historical evidence.
- An alert cannot be newly linked to a resolved incident.

## Dashboard Design

The operational dashboard keeps the current compact table layout.

- Add a Related incident column to the Alerts table.
- For unlinked alerts, show owner/manager actions within the row without exposing them to viewers.
- Use an in-page compact form or dialog for the create/link decision; do not navigate away before the operation completes.
- Show loading and error states in a full-width panel, never in a narrow grid column.
- Add a Related alerts panel to the Incident detail page after the incident context and evidence panels.
- Related links use the existing application navigation and preserve the active sidebar state.

## Security And Tenant Isolation

- Derive `organizationId` exclusively from the authenticated request context.
- Never accept a client-provided organization identifier.
- Verify all alert, incident, building, unit, and meter references belong to that organization.
- Restrict create and link endpoints to `owner` and `manager`; `viewer` receives the existing authorization response.
- Return tenant-safe not-found responses for resources outside the caller's organization.

## Testing

### Backend unit and integration coverage

- Creating from an alert creates exactly one incident, links the initiating alert, creates activity, and writes audit records.
- Linking adds the incident relationship once; a second link attempt is rejected and cannot replace or duplicate the relationship.
- Reject a link when the alert is already linked.
- Reject a link to a resolved incident.
- Reject cross-organization alert, incident, building, unit, and meter references without leaking data.
- Confirm alert and incident lifecycle transitions remain independent after linking.
- Confirm existing manual incident creation still works without an alert.

### Dashboard coverage

- Owner and manager see create and link actions for unlinked alerts.
- Viewer sees relationship information but no mutation actions.
- A linked alert displays its incident link.
- Incident detail displays its related alert list.
- Error messages use full-width state presentation.

### Manual verification

1. Seed demo data and sign in as `owner@north.example`.
2. Create or evaluate an alert, then create an incident from the alert.
3. Confirm the alert displays the incident link and the incident displays the alert.
4. Create a second alert and link it to the active incident.
5. Resolve either record and confirm the other record's status does not change.
6. Sign in as a viewer and confirm create/link actions are unavailable.
7. Attempt a cross-organization link through the HTTP client and confirm it is rejected.

## Acceptance Criteria

- No alert can automatically create an incident.
- Owners and managers can create an incident from an unlinked alert.
- Owners and managers can link an unlinked alert to a non-resolved incident in the same organization.
- Alert and incident pages show the relationship in both directions.
- Manual incidents remain supported.
- Existing alert and incident lifecycle behavior remains unchanged.
- Tenant isolation, role enforcement, and regression tests pass.
