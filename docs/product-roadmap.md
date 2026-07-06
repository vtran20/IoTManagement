# Smart Utilities SaaS Product Roadmap

**Last updated:** 2026-07-06
**Owner:** Product owner and engineering lead
**Status:** Living roadmap

## Purpose

This is the product-level path for IoTManagement. It records the outcomes the
platform must deliver as it grows from a smart-utilities operations tool into a
complete building-operations SaaS product. It is not a release-date promise and
does not replace an approved design specification or implementation plan.

Every future module follows this sequence:

1. Product/design specification and explicit approval.
2. Testable implementation plan.
3. TDD implementation with unit and regression coverage.
4. Manual verification, operational documentation, and release review.

## Product North Star

Help building owners and managers reliably move from utility signal to action,
cost accountability, prevention, and measurable improvement:

```text
Detect -> Notify -> Respond -> Resolve -> Account -> Prevent -> Improve
```

The product is organization-scoped. Buildings, units, meters, users, vendors,
work orders, and all future customer data remain tenant-isolated by
`organizationId`.

## Current Product Foundation

The existing core is the baseline, not a prototype to discard:

- Organization-based authentication, roles, and user-management flows.
- Buildings, floors, units, meters, readings, dashboard analytics, reports, and
  simulated data.
- Alert rules and alert events, with manual alert-to-incident creation/linking.
- Water leak-to-resolution workflows, moisture context, incident activity, and
  repair work orders.
- Organization-owned vendor directory, internal/vendor assignment, costs,
  work-order notes, and in-app overdue notifications.
- PostgreSQL persistence, migrations, Redis/BullMQ jobs, Kubernetes manifests,
  local verification guidance, and a local regression gate.

Before a new phase begins, stabilize any known defect in this baseline that
would compromise its workflow. The current product is intentionally not yet a
tenant portal, billing system, hardware control plane, or public property-site
platform.

## Roadmap Principles

- Build the response loop before adding more detection sophistication.
- Make financial decisions traceable and reversible; do not treat estimates as
  final bills.
- Keep raw readings immutable, meter history traceable, and ingestion
  idempotent.
- Do not automate incident creation: alerts carry evidence; staff decide when
  an incident is needed.
- Keep vendors directory-only until a separate vendor-portal business case is
  approved.
- Deliver customer-facing features only after their underlying data and privacy
  boundaries are dependable.
- Treat observability, accessibility, security, tenant isolation, performance,
  backups, and testing as release gates for every phase.

## Ordered Product Path

### 1. Response Reliability

**Status:** Next
**Outcome:** A critical signal reaches the right people, is acknowledged in
time, and has an auditable response trail.

**Scope:**

- Per-user in-app notification preferences; email follows after Dev Outbox
  verification.
- Escalation policies, contacts, acknowledgement deadlines, quiet hours, and
  schedule/time-zone handling.
- Alert and incident acknowledgement deadlines; work-order assignment, due,
  overdue, reassignment, completion, and cancellation notices.
- Notification history, delivery status, recipient-specific deduplication,
  retry/failure handling, read state, and audit records.
- Daily operations digest for critical alerts, unresolved incidents, and overdue
  work.
- Dev Outbox email preview first; a real provider only after the notification
  domain model is proven.

**Exit criteria:** A manager can configure an escalation policy, observe one
deduplicated notification lifecycle, acknowledge on time, and verify an
overdue/unacknowledged escalation in both the UI and audit history.

### 2. Utility Financial Operations

**Status:** Planned
**Outcome:** Owners can explain and allocate utility costs with confidence.

**Scope:**

- Tariff plans: fixed, tiered, time-of-use, demand/fees where applicable, and
  effective dates.
- Billing periods with controlled close, correction, and reopen policy.
- Shared-meter allocation rules, including unit assignment changes over time.
- Unit statements, building summaries, credits/adjustments, estimated versus
  final labels, and CSV/PDF exports.
- Reading-quality controls, meter replacement lineage, reconciliation, and an
  immutable billing/audit trail.

**Guardrail:** Utility chargeback, tenant notices, late fees, and billing rules
vary by jurisdiction. This phase requires a jurisdiction-specific legal and
operational review before it is positioned as a compliant tenant bill.

**Exit criteria:** A closed sample period can be reproduced from its source
readings, tariff version, allocation rule, and adjustments without changing a
previously issued statement.

### 3. Preventive Maintenance And Asset Care

**Status:** Planned
**Outcome:** The organization prevents repeat failures instead of only reacting
to them.

**Scope:**

- Asset registry linked to buildings, spaces, meters, and vendor trades.
- Recurring inspections, schedules, checklists, service intervals, and planned
  work orders.
- Maintenance evidence: photos/documents, completion verification, service
  history, and vendor performance context.
- Preventive-maintenance dashboard: upcoming, missed, compliance, and spend.

**Exit criteria:** A manager can schedule recurring work, complete its
checklist, retain evidence, and inspect the full asset/service history.

### 4. Real Device And Gateway Foundation

**Status:** Planned
**Outcome:** The platform can safely onboard and operate real meters without
changing its dashboard, alert, or billing contracts.

**Scope:**

- Device and gateway registry, ownership, lifecycle, provisioning, revocation,
  and credential rotation.
- HTTPS and MQTT adapters behind the existing normalized reading contract.
- Last-seen diagnostics, clock-skew/replay protection, rate limits,
  dead-letter handling, replay tools, and support diagnostics.
- Device configuration, firmware/update metadata, command audit trail, and
  controlled hardware pilot onboarding.

**Research basis:** The device profile will use NIST IoT baseline capabilities
for device identity, configuration, data protection, access control, secure
updates, and security-state awareness. See [NIST's technical capability
catalog](https://pages.nist.gov/IoT-Device-Cybersecurity-Requirement-Catalogs/technical/).

**Exit criteria:** A pilot device can be provisioned, send idempotent readings
through a real adapter, show diagnostics, be revoked, and leave a complete audit
trail.

### 5. Water And Energy Intelligence

**Status:** Planned
**Outcome:** Teams understand confidence, likely causes, and expected impact
before deciding what to do.

**Scope:**

- Usage baselines by meter/building/unit, time window, and operating context.
- Leak confidence, false-positive feedback, investigation outcomes, and model
  calibration rather than opaque automated decisions.
- Expected-versus-actual use, anomaly explanations, conservation
  recommendations, and data-quality confidence.
- Later: approved shutoff-valve integrations with manual safeguards, command
  audit, and fail-safe policy.

**Research basis:** EPA identifies metering/submetering, leak detection/repair,
and benchmarking as foundational water-management practices; it also notes that
flow monitoring can help multifamily buildings reduce water waste and leak
damage. [EPA WaterSense best practices](https://www.epa.gov/watersense/best-management-practices)
and [flow-monitoring guidance](https://www.epa.gov/watersense/leak-detection-and-flow-monitoring-devices)
inform this ordering.

**Exit criteria:** Users can see the evidence behind an anomaly and record a
useful feedback outcome that improves future triage without opening incidents
automatically.

### 6. Tenant Experience

**Status:** Planned
**Outcome:** Residents get useful, privacy-safe information and a clear way to
report issues without gaining access to property operations.

**Scope:**

- Tenant authentication and unit-scoped, read-only utility/cost views.
- Leak/outage notices, service/issue reporting, and communication preferences.
- Consumption goals, explanations, accessibility, and consent/privacy controls.
- Deliberate integration points with statements and maintenance workflows.

**Exit criteria:** A tenant can access only their authorized unit information,
report an issue, and receive relevant notices; owners can audit all access and
communication.

### 7. Portfolio Intelligence

**Status:** Planned
**Outcome:** Owners can prioritize capital, maintenance, and conservation work
across a portfolio using comparable facts.

**Scope:**

- Budget-versus-actual costs, normalized comparisons, occupancy-aware trends,
  and investment-priority views.
- Sustainability reporting: water/energy use, cost, emissions, energy-use
  intensity (EUI), water-use intensity (WUI), and data completeness.
- Internal benchmarks first; external benchmark/import integrations only after
  definitions and data quality are clear.

**Research basis:** ENERGY STAR Portfolio Manager tracks energy, water, costs,
emissions, and intensity measures, and uses benchmarking to identify
underperforming buildings and verify savings. [ENERGY STAR benchmarking](https://www.energystar.gov/buildings/benchmark)
and [metric definitions](https://www.energystar.gov/buildings/benchmark/understand-metrics)
are useful reference points, not mandatory product requirements.

**Exit criteria:** A portfolio owner can compare like-for-like buildings,
understand the normalization/data-completeness caveats, and trace a chart back
to its data source.

### 8. Public Property Websites And CMS

**Status:** Planned, later growth track
**Outcome:** An organization can market its portfolio without exposing its
private utilities operations.

**Scope:**

- One organization-branded public website with curated building pages.
- CMS drafts, review, revisions, publishing, media, SEO metadata, and sitemap.
- Public renter contact/request-a-tour leads routed to owners/managers.
- Controlled public projection of approved building information only; a future
  option for per-building domains.

**Always private:** meters/readings, costs, alerts, incidents, work orders,
resident identities, internal notes, and unpublished availability.

**Exit criteria:** An owner can publish and roll back a building page, manage a
renter lead, and prove private operational data cannot be reached through the
public site.

### 9. Integrations And SaaS Administration

**Status:** Planned
**Outcome:** The product can operate as a durable SaaS business within a larger
property-management ecosystem.

**Scope:**

- Webhooks, API keys, accounting/property-management imports and exports, and
  integration health/audit logs.
- SSO, SCIM where appropriate, subscription plans, entitlements, and usage
  limits.
- Organization onboarding, bulk imports, support/admin tooling, privacy/data
  retention controls, and customer health indicators.

**Exit criteria:** A support/admin workflow can onboard an organization,
observe integration failures safely, and enforce the commercial access model
without crossing tenant boundaries.

## Cross-Cutting Release Gates

Every phase must address these before it is marked complete:

- Tenant isolation, authorization, validation, auditability, and secure secret
  handling.
- Loading, empty, error, stale-data, desktop, and mobile dashboard states.
- Structured logs, endpoint/job timing, health checks, metrics, and actionable
  operational dashboards.
- Data retention, backup/restore, migration safety, and rollback strategy.
- Unit tests plus regression tests at the affected API/UI/end-to-end boundary.
- Accessibility, responsive layout, performance budget, and manual verification
  runbook.

## Roadmap Maintenance

### Status Vocabulary

- **Next:** the single approved product target to design/plan after current
  stabilization.
- **Planned:** ordered and intentionally deferred; no implementation starts
  until its specification and plan are approved.
- **In discovery:** requirements or feasibility are being researched.
- **In delivery:** approved implementation plan is actively being executed.
- **Stabilizing:** implemented, with focused feedback, regression, and
  operational checks underway.
- **Released:** accepted against its exit criteria.
- **Deferred:** deliberately out of sequence or blocked by a decision.

### Update Rules

1. Update this document at every phase approval, start, release, deferral, or
   material scope change.
2. Link a roadmap phase to its design specification and implementation plan
   once those files exist.
3. Keep one `Next` phase. Do not begin a second major module merely because the
   first is difficult.
4. Record customer evidence, assumptions, regulatory decisions, and the reason
   for any ordering change in the phase's specification.
5. Review the roadmap monthly and after significant customer feedback; prune
   items that no longer serve the North Star.

## Immediate Next Step

Create and approve the detailed design for **Response Reliability:
Notifications And Escalations**. It is the best next investment because it
closes the gap between detecting a problem and demonstrating that the right
person reacted in time.
