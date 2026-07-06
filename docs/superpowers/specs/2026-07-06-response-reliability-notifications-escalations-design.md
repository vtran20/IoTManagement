# Response Reliability: Notifications And Escalations Design

Date: 2026-07-06
Status: Approved design, pending implementation-plan review
Roadmap: [Response Reliability](/docs/product-roadmap.md#1-response-reliability)

## Goal

Make the existing operations workflows dependable from signal to response. A
critical alert, incident, or work-order change must reach the appropriate
people, respect their preferences, escalate when acknowledgement is overdue,
and leave an organization-scoped audit trail.

This phase keeps incident creation manual. Alerts notify staff and provide
evidence; an owner or manager decides whether to create or link an incident.

## Existing Foundation

The product already has a useful, deliberately narrow notification foundation:

- `incident_notifications` for incident-opened and acknowledgement-overdue
  delivery.
- Organization-level incident responder settings for email and two deadlines.
- Dev Outbox email delivery for incident notifications.
- BullMQ delayed jobs for incident acknowledgement and work-order overdue
  checks.
- `work_order_notifications` for in-app overdue notices.
- A `GET /api/v1/notifications` feed that combines those two record types.

The new work consolidates this behavior without losing historical records or
breaking the current feed. It does not duplicate it beside a second,
incompatible notification path.

## Decisions

### Canonical Operations Notification

Introduce `operations_notifications` as the canonical delivery record for every
in-app or email notification. Existing incident and work-order rows migrate
into it. The legacy tables stay read-only for one compatibility release; no
current endpoint is removed in this phase.

Each record contains:

- `organizationId` and exactly one recipient: a membership or an email-only
  escalation contact.
- Source type and source ID: `alert_event`, `incident`, `work_order`, or
  `daily_digest`.
- Event type, severity when applicable, title/body snapshot, dashboard href,
  and a JSON metadata snapshot suitable for history rendering.
- Channel: `in_app` or `email`.
- Delivery state: `queued`, `delivered`, `suppressed`, or `failed`.
- Recipient/channel-specific `dedupeKey`, Dev Outbox reference when applicable,
  timestamps, suppression reason, delivery failure reason, and read state.

Database constraints prevent both recipient columns being populated at once,
or neither being populated. Unique indexes scope deduplication by organization,
recipient, channel, and key.

### Preferences And Escalation Configuration

Notifications are configured at three levels.

1. **Personal preferences** belong to an active owner or manager membership.
   They include in-app enabled, email enabled, quiet-hours start/end, and IANA
   time zone. In-app is enabled by default; email is optional and uses Dev
   Outbox in this phase.
2. **Escalation contacts** are organization-owned. A contact references an
   active internal membership or stores an external name/email only. External
   contacts never receive a login, membership, dashboard access, or vendor
   portal.
3. **Escalation policies** are owner-managed rules selected by source type and
   severity. A policy contains acknowledgement deadline, escalation delay,
   enabled state, critical quiet-hour override, and ordered recipient steps.

Only owners administer policies and contacts. Owners and managers update their
own preferences. Viewers do not receive operations notifications and do not see
configuration controls.

The recipient evaluation order is: matching source/severity policy, source
default policy, then a conservative organization default. Existing incident
responder settings map into initial policy defaults during migration and remain
available through their current endpoint until clients have moved.

### Quiet Hours

Quiet hours are evaluated using the recipient preference time zone, never the
browser time zone. Non-critical delivery is suppressed or deferred according to
the policy. Critical policies may override quiet hours. A suppressed delivery
is still recorded so an owner can understand why someone did not receive it.

The first release records the decision and delivers deferred messages at the
end of quiet hours. It does not add SMS, phone, mobile push, on-call rotations,
or calendar schedules.

### Producers And Response Rules

The unified dispatcher accepts a source-specific event and applies policy,
preference, quiet-hour, deduplication, delivery, and audit rules.

| Source | Events in scope | Acknowledgement/escalation rule |
| --- | --- | --- |
| Alert | opened, acknowledgement overdue, resolved | Open warning/critical alerts can have an acknowledgement deadline; no alert creates an incident automatically. |
| Incident | opened, acknowledgement overdue, acknowledged, resolved | Escalate while the incident remains acknowledgement-eligible; terminal incidents are skipped. |
| Work order | assigned, reassigned, due, overdue, completed, cancelled | Notify internal assignee and configured operations recipients. Vendors remain directory-only and are not notified in this phase. |
| Daily digest | critical alerts, unresolved incidents, overdue work | One recipient-specific summary at the configured local delivery time. |

Acknowledging or resolving a source does not erase its history. It causes later
deadline jobs to return `skipped`, with the reason visible in job logs/audit
data. Repeated worker delivery and retries must result in at most one delivery
per recipient, channel, and event key.

### Jobs And Delivery

Replace source-specific job behavior with a generic notification-deadline queue
that carries `organizationId`, source type, source ID, event type, policy ID,
and deadline timestamp. It re-fetches source state and policy eligibility when
it runs; a stale job cannot notify after resolution.

Add a daily-digest queue. A scheduler evaluates organization policies and
recipient time zones, then creates one digest event per recipient/day. A digest
contains only data visible to the recipient under their current membership.

Email delivery keeps the `EmailService` abstraction and Dev Outbox provider.
The delivery record references the outbox item and records queued/delivered or
failed state. A future provider can replace the transport without changing the
notification domain model.

### API Contract

Keep the existing feed and mark-read endpoints. Extend them so they return the
canonical notification response shape for all source types.

```text
GET    /api/v1/notifications?unreadOnly=&sourceType=&limit=
POST   /api/v1/notifications/:notificationId/read

GET    /api/v1/notifications/preferences/me
PATCH  /api/v1/notifications/preferences/me

GET    /api/v1/notifications/escalation-contacts
POST   /api/v1/notifications/escalation-contacts
PATCH  /api/v1/notifications/escalation-contacts/:contactId

GET    /api/v1/notifications/escalation-policies
PUT    /api/v1/notifications/escalation-policies

GET    /api/v1/dev/email-outbox
```

The API derives organization and membership from the authenticated session. It
never accepts a client-supplied organization ID. The existing
`/incident-responder-settings` endpoints remain compatibility endpoints in this
phase; the dashboard moves to the new notification paths.

### Dashboard Experience

Use the existing operational dashboard shell and styles.

- Add a compact top-bar notification control with an unread count and a direct
  link to the notification centre.
- Add `/notifications` with source/status filters, timestamp, delivery state,
  source link, mark-read action, loading/error/empty/stale states, and a clear
  separation between unread and history.
- Add Settings > Notifications for each owner/manager's delivery preferences
  and quiet hours.
- Add owner-only Settings > Escalations for contacts, policy steps, deadlines,
  and critical quiet-hour override.
- Preserve the concise overdue work notice until the notification centre makes
  it redundant; do not remove an existing actionable reminder without a
  regression test.

## Data And Security

New migration-backed tables:

- `operations_notifications`
- `notification_preferences`
- `escalation_contacts`
- `escalation_policies`
- `escalation_policy_steps`
- `notification_digest_runs`

Indexes cover organization/recipient/read-state/creation time, source lookups,
dedupe keys, policy selection, active contacts, and daily digest deduplication.
All queries require organization scope. Contact email addresses are treated as
private operational data and never exposed to a different organization.

All mutation endpoints use DTO validation. Contact email is normalized and
validated; time zones must be valid IANA identifiers; quiet-hour ranges,
deadlines, and ordered policy steps are bounded. The audit log records
preference, contact, and policy changes without storing secrets.

## Delivery Phases

### Phase 1: Canonical Data And Compatibility

- Add types, schema migration, repository methods, row mappers, and migration
  of historical incident/work-order notifications.
- Add notification dispatcher and compatibility reads.
- Add focused tests for migration, tenant isolation, read state, and
  recipient/channel deduplication.

### Phase 2: Preferences, Contacts, And Policies

- Add personal preferences, escalation contacts, ordered policies, validation,
  authorization, audit entries, and API endpoints.
- Map existing responder settings into default incident policies.
- Add tests for owner/manager/viewer permissions, quiet-hour evaluation,
  contact isolation, and policy precedence.

### Phase 3: Producers, Deadlines, Email, And Digest

- Move alert, incident, and work-order events through the dispatcher.
- Replace delayed queue handling with generic deadline jobs and add daily
  digest scheduling.
- Extend Dev Outbox templates and delivery status handling.
- Add unit/integration tests for source state re-checks, retry dedupe,
  resolution skip, external email-only contacts, and recipient-local digest
  dedupe.

### Phase 4: Dashboard And Full Regression

- Implement notification centre, personal preferences, and owner-only
  escalation settings.
- Add dashboard component/Playwright coverage for preferences, permissions,
  unread/read workflow, filters, error/loading/empty states, and source links.
- Run full API, dashboard, end-to-end, and Kubernetes manifest verification.

## Non-Goals

- SMS, phone, mobile push, Slack, Microsoft Teams, or a production email
  provider.
- Automatic alert-to-incident creation.
- External vendor accounts or a vendor portal.
- Shift/on-call scheduling, calendar integration, or schedule overrides beyond
  individual quiet hours.
- Attachments or public notification feeds.

## Acceptance Criteria

- Existing incident and work-order notifications continue to be visible and
  readable after migration.
- A policy produces at most one delivery per recipient/channel/event despite
  retries or worker restarts.
- Acknowledged/resolved alerts and incidents do not escalate after their state
  changes.
- Quiet hours, critical override, delivery state, and suppression reason are
  observable.
- Owners can manage policies/contacts; managers manage only their own
  preferences; viewers remain read-only.
- No notification, contact, digest, or source link can cross organization
  boundaries.
- Dev Outbox exposes email notification content locally without any real email
  delivery.

## Manual Verification After Delivery

1. Seed demo data, start API, worker, and dashboard, then sign in as an owner.
2. Configure a manager's quiet hours and an escalation policy for critical
   alerts; create an alert through the existing simulation/ingestion workflow.
3. Confirm the in-app notification appears once, the Dev Outbox contains the
   optional email once, and the notification links to the alert.
4. Leave the alert open past its deadline and confirm one escalation delivery.
   Acknowledge it, then verify later queued deadline work skips delivery.
5. Create/reassign an internal work order, pass its due time, and confirm the
   expected assignment/overdue notices and one digest entry.
6. Sign in as a viewer and another organization user; verify neither can alter
   policies nor read the first organization's notifications or contacts.
