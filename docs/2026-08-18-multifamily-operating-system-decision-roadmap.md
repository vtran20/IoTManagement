# Multifamily Operating System: Decision Roadmap

**Date:** 2026-08-18
**Status:** Decision record from the three-agent discovery review; proposed for product-owner acceptance
**Scope:** The entire multifamily operating-system direction, extending the current smart-utilities platform
**Decision authority:** This record documents the decisions reached in this review. It does not silently replace the repository's current source-of-truth MVP design until the product owner accepts it and the governing design specification is updated.

## Executive decision

We will evolve IoTManagement into a **multi-tenant, integration-first multifamily operations and intelligence layer**. It will connect trusted property, resident, leasing, maintenance, asset, utility, and financial-reference data; turn signals into explainable, governed actions; and automate only workflows that are low-risk, measurable, and explicitly authorized.

The product will **not** begin as a wholesale replacement for a mature property-management system (PMS), accounting ledger, payment processor, or revenue-management system. An incumbent PMS/accounting product remains the contractual system of record for leases, resident ledgers, and formal accounting until a separately approved replacement program exists. Our platform becomes the system of intelligence and, where approved, the system of action.

The immediate commercial wedge remains the strongest proven capability already in the repository: **utility intelligence and water-leak response through incident resolution and repair work**. We will turn that wedge into a reliable operational core before expanding into broader multifamily workflows.

## 1. Inputs, evidence, and interpretation

### Source materials

| Input | How it was used | Authority |
|---|---|---|
| `docs/superpowers/specs/2026-06-29-iot-utilities-saas-design.md` | Current approved-direction constraints for the smart-utilities product | Repository source of truth until explicitly revised |
| `docs/product-roadmap.md` | Existing product sequence and principles | Living roadmap to be reconciled with this record |
| Current repository code, migrations, tests, deployment manifests, and local docs | Evidence of current capabilities and technical maturity | Implementation evidence |
| `Tôi muốn một Operating System cho Multifamily Apartment.docx` | Vietnamese product vision and capability inventory | Product inspiration, not a validated specification |
| `The-AI-Operating-System-for-Multifamily.pdf` | Product narrative, target ICP, and AI operating-system thesis | Product inspiration, not a validated specification |
| [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), [NIST CSF 2.0](https://www.nist.gov/cyberframework), [EPA multifamily water guidance](https://www.epa.gov/watersense/leak-detection-and-flow-monitoring-devices), and [ENERGY STAR multifamily benchmarking](https://www.energystar.gov/buildings/resources-audience/multifamily-housing) | Safety, AI governance, security, and utility/benchmarking reference points | External guidance, not product requirements by itself |

### How to read this document

- **Implemented** means there is code and relevant automated coverage in this repository.
- **Partial** means a usable foundation exists, but a key production workflow or contract is incomplete.
- **Planned** means a decision is made about direction, but implementation has not started.
- Statements, savings percentages, market sizes, and timeline claims from the two supplied vision documents are treated as **hypotheses**, not commitments, unless validated in a pilot.

## 2. What we have today

The current product is a substantive smart-utilities operations platform, not a bare prototype. Its best developed closed loop is:

```text
meter/sensor reading -> evidence/rule -> alert or leak incident -> acknowledgement/investigation
-> containment/repair work order -> vendor or staff execution -> audit trail/report
```

### Current capability inventory

| Domain | Maturity | What exists now | Decision for the future |
|---|---|---|---|
| Tenant identity and access | Implemented | Organization-scoped data, authentication, RBAC, owner/manager/viewer/tenant roles, CSRF-aware sessions, tenant-isolation tests | Retain as the base; add property-scoped permissions, SSO, SCIM, and support-access controls later |
| Portfolio model | Implemented | Buildings, floors, units, meter assignment and lifecycle | Extend into a time-aware property and asset graph; preserve current IDs and history |
| Water and electricity telemetry | Implemented, water-weighted | Immutable readings, validation, idempotency key based on meter/timestamp, simulations, aggregates, estimated cost | Keep the normalized reading contract; add device provenance, quality, late-data and real-device operations |
| Dashboard and reporting | Implemented | Operational dashboard, rankings/trends, alerts, incidents, work orders, monthly and leak-response reports | Evolve toward persona-specific action centers and explainable health views rather than generic dashboards |
| Alerting and water response | Implemented/partial | Rules/events, leak incidents, moisture-sensor correlation, notifications, vendors, repair work orders | Make evaluation, stale health, escalation, delivery, and reporting reliable asynchronous services |
| Notifications | Partial | In-app notifications, delayed acknowledgement/overdue jobs, development email outbox | Add provider adapters, preferences, quiet hours, schedules, delivery webhooks, retry/DLQ, and auditability |
| API contract | Partial | REST `/api/v1`, typed client, manually assembled OpenAPI endpoint | Generate/validate a complete contract before device, mobile, or third-party integration expansion |
| Platform deployment | Implemented foundation | PostgreSQL, Redis/BullMQ, Docker, Kubernetes base/overlays, API/web/worker/migration workloads | Add observability, secret management, backup/restore, promotion, autoscaling, TLS, and disaster-recovery proof |
| Real devices/gateways | Not started | `Meter.source` vocabulary only | Build a governed device/gateway foundation before protocol pilots |
| Billing/chargeback | Not started | Estimated utility cost only | Build auditable financial operations before any tenant bill/collection claim |
| Asset/preventive maintenance | Not started | Incident-repair work orders and vendors | Generalize into assets, plans, inspections, recurring work, inventory, and capital context |
| Leasing, marketing, and CRM | Not started | No product model or workflow | Integrate with PMS/CRM first; build a narrow, supervised workflow after operations core is trusted |
| Resident experience | Not started | A tenant role exists, but no resident portal or unit-scoped workflow | Build privacy-safe resident access after identity, consent, and PMS synchronization are ready |
| SaaS administration and integration fabric | Not started | No webhooks, API keys, SSO/SCIM, connectors, entitlements, or support console | Treat this as a platform capability, not an afterthought |

### Current strengths to preserve

1. The NestJS modular-monolith direction is appropriate. Do not prematurely replace it with microservices.
2. Organization is the tenant boundary; all customer-owned records stay organization-scoped.
3. Raw accepted meter readings are immutable; interfaces must preserve reading lineage and idempotency.
4. The product already treats alerts as evidence and lets people decide whether to open an incident. Keep this human decision boundary.
5. The dashboard is an operating workspace, not a marketing site. Continue to prioritize dense, readable tables, charts, states, and actionable workflows.
6. Water and electricity must remain first-class utility types. The operational capability gap for electricity must be closed rather than hiding it behind water-specific workflows.

## 3. Product thesis and strategic boundaries

### Product thesis

> A multifamily operating system that gives each role one trustworthy place to understand what is happening, decide what to do, execute the approved action, and learn from the outcome—without breaking the incumbent systems that already own leases, accounting, and resident records.

### Strategic position

| Decision | Adopted position | Why |
|---|---|---|
| PMS strategy | Integrate first; do not replace at launch | A replacement requires accounting, lease, compliance, migration, support, and ecosystem capabilities far beyond the validated wedge |
| System-of-record model | Explicitly separate source of record, canonical operational model, analytics model, and action workflow | “Single source of truth” is misleading when reliable external systems remain in use |
| Initial ICP | Mid-market operators with roughly 500–5,000 units, subject to customer discovery | Large enough for material operational ROI and concentrated enough for short feedback loops |
| Initial product wedge | Water/utility operations, leak response, repair workflow, and operational visibility | Strongest current implementation and a measurable loss-prevention problem |
| Differentiation | Trusted operational data + closed-loop workflow adoption + measured outcomes | Generic AI chat, dashboard widgets, and commodity sensors are not durable moats |
| AI posture | Explainable assistance and recommendations before constrained automation | Reliability, legal compliance, resident safety, and operator trust are prerequisites |
| Digital twin | A time-aware property/asset graph, not a decorative 3D model | It relates locations, assets, telemetry, work, costs, residents, and outcomes across time |

### Explicit non-goals for the early platform

- Do not market or build a full general ledger, rent payment processor, trust-accounting engine, or complete PMS replacement.
- Do not automatically change rent, concessions, lease eligibility, screening outcomes, collections treatment, vendor awards, capital spending, or resident-impacting device controls.
- Do not pool tenant data for model training without contractual authority, a defined purpose, de-identification where appropriate, and governance approval.
- Do not claim a fixed failure-prediction horizon, revenue lift, energy saving, or marketing ROI before pilot baselines prove it.
- Do not add computer vision, license-plate recognition, resident behavioral profiling, or autonomous smart-valve control as a casual extension of the platform.

## 4. Operating model: systems, data, and ownership

### Four data roles

| Data role | Meaning | Examples | Rule |
|---|---|---|---|
| System of record | Contractual or authoritative owner of a fact | PMS lease, accounting ledger, payment processor, screening result | Ingest references and synchronize; do not silently overwrite |
| Canonical operational model | Our normalized, tenant-scoped model used to operate workflows | Organization, property, unit, asset, meter, work order, incident, vendor | Versioned contracts, history, identity mapping, and provenance required |
| Analytical model | Derived facts used for metrics, forecasting, and comparison | Usage aggregate, health-score factor, attribution, forecast, benchmark | Reproducible from source facts with freshness and lineage |
| System of action | A bounded workflow that changes an external or internal state | Dispatch work order, send approved message, schedule tour, create PMS task | Explicit approval/policy, idempotency, audit event, outcome capture, and rollback/compensation path |

### Canonical domain map

```text
Organization
  -> Portfolio -> Property -> Building -> Floor -> Unit -> Space
  -> Users/Memberships, Roles, Policies, Audit

People
  -> Household/Resident, Prospect/Applicant, Employee/Technician, Vendor Contact

Operations
  -> Service Request -> Incident -> Work Order -> Task/Assignment -> Labor/Material -> Outcome

Assets
  -> Asset hierarchy -> Warranty -> Maintenance Plan -> Inspection -> Observation -> Capital Project

IoT and utilities
  -> Gateway -> Device -> Capability -> Meter/Sensor -> Immutable Reading/Event -> Alert/Anomaly -> Command Audit

Commercial and leasing references
  -> Campaign -> Touchpoint -> Lead -> Tour -> Application -> Offer -> Lease/renewal reference

Financial references
  -> Tariff -> Allocation -> Billing Period -> Statement/adjustment reference -> Budget/actual -> ROI record

Intelligence governance
  -> Metric Definition -> Feature Snapshot -> Model/Rule Version -> Recommendation -> Approval/Override -> Outcome
```

### Time and history rules

- Entity ownership, assignment, meter replacement, asset location, tenant/unit relationship, tariff applicability, policy configuration, and permission scope are effective-dated where a historical report could otherwise change.
- Accepted telemetry is append-only. Corrections create a separate correction/quality event; they do not mutate the original observation.
- A report, recommendation, statement, or health score stores the source version, data cutoff, calculation/model version, and applicable policy version.
- Every cross-system record has a source-system identity, synchronization cursor/version, received time, and reconciliation state.

## 5. Target architecture

### Design direction

Keep the current TypeScript monorepo, NestJS REST API, Next.js dashboard, PostgreSQL, Redis/BullMQ, and Kubernetes deployment base. Evolve the modular monolith into an event-aware platform before extracting services. Domain modules may later be split only when independent scale, security boundary, or team ownership proves the need.

```text
Experiences
  executive | regional/property manager | leasing | technician | resident | prospect | support/admin
       |
Experience APIs and action center
       |
Domain modules and policy engine
  portfolio | assets | maintenance | utility | incidents | leasing | resident | finance-reference
       |
Integration and event boundary
  PMS connector | device adapters | communications | payments | listings | calendar | webhooks
       |
Data platform
  PostgreSQL operational store | immutable telemetry | object/media store | analytics aggregates | audit ledger
       |
Intelligence platform
  metrics | rules | forecasts | recommendations | approved agents | outcome/feedback ledger
       |
Platform foundation
  tenant isolation | RBAC/ABAC | API contracts | observability | jobs | secrets | backups | CI/CD
```

### Required architecture decisions

1. **Event envelope:** Define a versioned, signed/verified event envelope for inbound integration and device data: event ID, organization/source identity, schema version, occurred/received time, idempotency key, correlation/causation IDs, payload, provenance, quality, and encryption classification.
2. **Adapter boundary:** PMS, device/gateway, messaging, payment, listing, calendar, and access-control integrations sit behind adapters. Dashboard-facing code consumes normalized domain contracts, never vendor payloads.
3. **Outbox/inbox reliability:** External actions and inbound events use transactional outbox/inbox patterns, idempotent handlers, retries with backoff, DLQs, replay controls, and operator-visible reconciliation.
4. **Policy engine:** Permissions, notification/escalation, dispatch, approval, automation, and retention policies must be explicit, versioned, organization-scoped, explainable, and auditable.
5. **Action center:** An insight becomes an action only when it has a source/evidence set, owner, priority, SLA, recommendation, policy/approval state, status, and measured outcome.
6. **Contract-first APIs:** Generate and validate OpenAPI plus event schemas from source definitions; publish a compatibility policy and build typed web/mobile/partner clients from them.

## 6. AI and automation governance

### Four layers, in order

| Layer | Purpose | Early examples | Control boundary |
|---|---|---|---|
| Deterministic intelligence | Transparent metrics, rules, routing, and calculations | stale meter, leak threshold, work-order SLA, data-quality flag | Fully explainable; configuration and audit required |
| Predictive analytics | Estimate risk, demand, or likely outcome | failure risk, usage forecast, no-show likelihood, renewal propensity | Evaluate accuracy, drift, fairness, and confidence; no automatic high-impact decision |
| Optimization | Recommend an action under constraints | maintenance priority, staffing suggestion, marketing-spend allocation, pricing recommendation | Objective, constraints, simulation, approval, override, and experiment design required |
| LLM/agent experience | Answer, summarize, retrieve, classify, draft, and invoke narrow tools | leasing assistant, maintenance triage copilot, executive briefing | Tenant-scoped retrieval, source citations, constrained tools, human escalation, prompt-injection protection, audit |

### Decision ledger requirements

Every rule/model/agent recommendation must record:

- organization and property scope;
- input-data snapshot, freshness, and provenance;
- rule/model/prompt/tool version;
- confidence and explanation in user language;
- expected outcome and stated uncertainty;
- policy or human approval state;
- executed action, external correlation ID, and failure/rollback state;
- observed outcome, feedback label, and override reason.

### High-impact actions that always require human approval

- Rent/concession/pricing changes, lease/application/screening/collections decisions, and adverse resident actions.
- Resident-impacting shutoff, access, safety, security, or camera/plate-recognition actions.
- Vendor award, high-cost work, procurement, capital project, or budget commitment above configured limits.
- Any outbound communication that could be legally regulated or materially harm a resident relationship, unless the organization has explicitly approved a low-risk policy/template.

### AI data and fairness policy

- Do not use protected-class data or proxy features for housing, pricing, advertising, screening, renewal, collections, or resident prioritization decisions.
- Segment and evaluate models by legally and ethically appropriate populations; retain test evidence and human-override review.
- Use tenant data only under written contractual terms. Cross-tenant benchmarks require aggregation/de-identification and a published methodology; no tenant can see another tenant's raw data.
- Treat NIST AI RMF and the Generative AI profile as operating references for risk management, documentation, testing, monitoring, and incident response.

## 7. Nonfunctional release requirements

No roadmap phase is complete unless its affected services have the following evidence.

| Area | Minimum release requirement |
|---|---|
| Security and tenancy | Organization and property-scope authorization tests, least privilege, secret rotation, encryption in transit/at rest, audit history, support-access controls |
| Reliability | Defined SLO/SLA for the workflow, retries, idempotency, timeout/degradation behavior, health checks, DLQ/replay plan, and incident runbook |
| Data quality | Source, freshness, completeness, validity, duplicate, late/out-of-order, and reconciliation treatment visible to users where material |
| Observability | Structured logs with correlation IDs; metrics, traces, queue metrics, dependency health, and actionable alerts |
| Privacy | PII/media classification, purpose/consent, retention/deletion, export/access controls, and vendor-data assessment |
| Accessibility and experience | Loading, empty, error, stale-data, desktop, mobile, keyboard, screen-reader, language/localization consideration, and performance states |
| Change safety | Migration, rollback/compensation, backward-compatible API/event contracts, unit tests, regression tests, integration tests, and manual verification runbook |
| Disaster recovery | Backup, restore rehearsal, documented RPO/RTO, and dependency-failure behavior for the phase's critical workflows |

## 8. Full roadmap

The roadmap is sequenced by dependencies and pilot risk, not by an unvalidated calendar promise. Each wave must have an approved design specification, implementation plan, test plan, measurable pilot objective, and release decision before work starts.

### Delivery tracking table

Use this table as the management view for the roadmap. Work is ordered by dependency and grouped so that closely related components can be planned, staffed, and released together. `Current` means an existing production-shaped capability; `Partial` means a useful foundation exists but the end-to-end operating contract is incomplete; `Planned` means no implementation should start until that row's design is approved; `Deferred` means a deliberate later decision, not an overlooked task.

| Order | Priority | Delivery group / component | Current status | What we have now | Next concrete outcome | Completion evidence / management gate | Dependencies | Accountable roles |
|---:|---|---|---|---|---|---|---|---|
| 0 | P0 | **Current smart-utilities operating core** — tenancy, portfolio, readings, dashboard, alerts, incidents, vendors, repair work orders, reports | Current; implemented, with release-readiness gaps | Organization tenancy/RBAC, water and electricity readings, simulations, dashboard, alert/incident workflow, vendors, work orders, reports, PostgreSQL/Redis/Kubernetes foundation | Stabilize and prove the existing leak-to-repair workflow before expanding scope | Full API/UI/infrastructure regression gate; tenant-isolation proof; known workflow defects triaged or fixed; manual product runbook executed | None — this is the baseline | Engineering lead, QA, product owner |
| 1 | P0 | **Product contract and delivery governance** — source of truth, ICP, pilot, scope control | Planned; decision record exists, current governing MVP spec is still draft | This roadmap, existing MVP design, product roadmap, architecture/audit material | Accept one source-of-truth hierarchy; select initial ICP, first pilot profile, first PMS target, sponsor, deployment and packaging hypotheses | Signed decision log; named owners; every active wave has an approved spec, plan, measurable outcome, and explicit non-goals | Order 0 | Product owner, engineering lead, customer/pilot sponsor |
| 2 | P0 | **Platform reliability and delivery foundation** — API contracts, CI/CD, security, observability, recovery | Partial | REST API, typed client, Docker/Kubernetes manifests, health endpoints, migrations; OpenAPI is incomplete/manual; production controls are incomplete | Generated/validated API and event contracts, CI promotion, managed-service assumptions, secrets/TLS, telemetry, backup/restore and on-call runbooks | Contract compatibility check; deployment promotion succeeds; restore rehearsal meets agreed RPO/RTO; dashboards/alerts cover API, queue and dependency health | Orders 0–1 | Platform engineering, security, API engineering |
| 3 | P0 | **Response reliability** — jobs, notifications, escalation, stale health, reporting automation | Partial | In-app notifications, delayed acknowledgement/overdue jobs, dev email outbox, alerts/incidents; aggregation/stale/alert evaluation are not fully autonomous | Reliable scheduled jobs; notification preferences, quiet hours, delivery provider/adapters, retries/DLQ, recipient deduplication and escalation policies | Critical signal reaches configured recipients once, escalates at deadline, retains delivery/acknowledgement audit; failed jobs are observable and replayable | Orders 0–2 | Operations product lead, backend, platform, support |
| 4 | P0 | **Action center and operational response model** — alert to accountable work | Partial | Alerts, incidents, work orders, vendor and audit flows exist, strongest for water | Unified action center with owner, priority, SLA, evidence, policy/approval state, recommended action, outcome; electricity-response parity | Operator can trace a signal through decision, communication, work, cost reference and resolved outcome without losing evidence | Orders 0–3 | Operations product lead, backend, dashboard, support |
| 5 | P1 | **Property digital twin and asset care** — spaces, assets, planned work, inspections | Planned; current building/unit/meter and repair-work-order base exists | Building/floor/unit hierarchy, meters, repair work orders, vendors | Time-aware asset/location model; planned/reactive maintenance, inspections, checklists, evidence, warranty and recurring work | Work order is traceable to asset/location/history; technician can complete work and evidence; maintenance history is reproducible | Orders 0–4 | Maintenance product lead, backend, dashboard/mobile |
| 6 | P1 | **PMS integration foundation and data ownership** — reconciliation, canonical operational model | Planned | No PMS connector; current organization/portfolio model and API foundation are available | One tenant-safe PMS connector, field-ownership map, full/delta sync, reconciliation, sync-health dashboard and recovery procedures | Source-vs-canonical data is explicit; sync conflict/failure is visible and recoverable; no silent overwrite of lease/ledger authority | Orders 1–2 and 5 | Integrations lead, backend, product, pilot customer IT |
| 7 | P1 | **Building health and trusted metrics** — explainable operational intelligence | Planned; dashboard/utility aggregates exist | Usage trends/rankings, alerts, incidents, reports, cost estimates | Component health scoring with metric definitions, freshness/coverage, weights, drill-down and action-center links | Any score drills to source facts, data quality, time window, and actionable owner; no opaque single-number health score | Orders 4–6 | Data/analytics lead, operations product, dashboard |
| 8 | P1 | **Real-device and gateway foundation** — device lifecycle and normalized telemetry | Planned; simulation and normalized reading contract exist | Simulated readings through actual ingestion; meter source metadata; no device identity/gateway/protocol adapter | One selected transport/device pilot with device/gateway registry, credential rotation/revocation, provenance, inbox/outbox, DLQ/replay and diagnostics | Device can be provisioned, send idempotent reading, expose health/provenance, fail safely, and be revoked; replay/bad-data cases proven | Orders 2–4; pilot hardware/customer decision from Order 1 | IoT lead, backend, platform/security, field operations |
| 9 | P2 | **Utility financial operations and conservation intelligence** — tariffs, allocation, qualified benchmarks | Planned; estimated cost and aggregates exist | Water/electric estimates, raw readings, aggregates and operations reports | Effective-dated tariffs, meter lineage, allocation, controlled periods, corrections, audit exports, baselines, ROI and qualified portfolio comparisons | Closed sample period reproduces source readings, policy/calculation versions, allocations and adjustments; legal review before tenant chargeback claims | Orders 5–8; jurisdiction/legal decision | Finance product lead, data/analytics, backend, legal/compliance |
| 10 | P2 | **Resident and technician experiences** — portal, mobile/offline, service communication | Planned; tenant role and repair flow exist | Tenant role, dashboard and work-order foundations; no resident portal or field mobile app | PMS-linked household identity, unit-scoped access, consent/preferences, resident service/status flow, technician mobile/offline completion | Resident sees only authorized unit/household data; offline technician work synchronizes safely; communication history is auditable | Orders 5–6 and 9 | Resident product lead, mobile/dashboard, security/privacy, property operations |
| 11 | P2 | **Leasing, marketing, and prospect workflow** — CRM, tours, grounded assistant | Planned | No CRM/leasing model; current property data can become the trusted availability context | Lead/touchpoint/consent model, attribution, response SLA, calendar/tour integration, human follow-up queue, grounded Q&A assistant | Prospect answer is fact-sourced and property-scoped; tour is booked with human handoff; no screening, eligibility, or price decision is automated | Orders 6–7 and 10; CRM/ILS/calendar partner selection | Leasing product lead, integrations, dashboard/mobile, legal/compliance |
| 12 | P3 | **Decision intelligence and constrained automation** — models, copilots, outcome learning | Planned; deterministic rules are the starting point | Utility rules, anomaly/leak logic, manual operational workflows | Model/rule registry, feature snapshots, decision ledger, evaluation/drift/fairness controls, explainable recommendations and narrowly scoped copilots | Each recommendation exposes source, freshness, confidence, version, policy/approval and realized outcome; rollback works; high-impact actions remain human-approved | Orders 4–11 and sufficient pilot outcome data | AI/data lead, security/privacy, product, domain owners |
| 13 | P3 | **Portfolio, enterprise, and integration ecosystem** — SSO/SCIM, APIs, SaaS operations | Planned | Organization tenancy, baseline Kubernetes deployment, typed API client | Enterprise identity, support controls, API keys/webhooks/sandbox, onboarding, entitlements, customer health, capital/ESG views | Tenant-safe partner integration passes contract/replay/reconciliation checks; enterprise provisioning/audit works; portfolio metrics disclose comparability/coverage | Orders 2, 6–7, 9, 12 | Platform/product lead, integrations, security, customer success |
| 14 | Deferred | **Safety-governed autonomy and advanced sensing** — valve control, vision, cross-portfolio learning | Deferred by design | No real device commands, camera/vision, or cross-tenant model training | Separate safety/legal/business case for each capability; recommendation-only proof before any constrained action | Documented safety case, manual override, fail-safe test, privacy/fairness review, contractual data authority and post-incident process | Orders 8, 12–13 plus explicit product-owner approval | Executive sponsor, safety/compliance, security, IoT/AI leads |

#### How to keep the table current

1. Keep a single active P0 delivery group at a time; Orders 0–4 are intentionally sequenced so current reliability is not diluted by new feature work.
2. Change a row's status only after its evidence/gate has been recorded in the linked design, plan, release note, or pilot review.
3. If a dependency, owner, external vendor, legal review, or pilot assumption changes, update this table and the detailed wave immediately.
4. Do not begin an item marked `Planned` or `Deferred` just because it is attractive; first approve its focused design and implementation plan.

### Wave 0 — Product contract and release readiness

**Outcome:** One coherent product direction and a dependable current baseline.

**Build/decide**

- Reconcile the current MVP design, living product roadmap, and this decision record into an accepted source-of-truth hierarchy.
- Establish the initial ICP, pilot profile, first PMS target, pricing/packaging hypothesis, deployment model, and named executive sponsor.
- Run the full API, dashboard, and infrastructure release gates; resolve defects that compromise the current leak-to-repair workflow.
- Complete generated/validated OpenAPI coverage, API versioning policy, and integration/event-schema conventions.
- Add CI quality gates, secrets-management strategy, TLS/certificate plan, managed database/Redis deployment assumptions, backup/restore rehearsal, release promotion, and production observability baseline.
- Convert autonomous-risk gaps into reliable jobs: scheduled stale-meter detection, aggregation, alert evaluation, notification escalation, and reporting with monitoring.

**Exit evidence**

- A full current-platform regression gate passes in a disposable environment.
- One source-of-truth map and decision-log ownership is accepted.
- A manager can observe a stale-meter or leak path through alert, incident decision, notification, work order, and audit history without manual background-job triggering.
- Restore evidence and an on-call/runbook drill exist for the pilot environment.

**Do not start yet:** real-device pilots, tenant billing, resident portal, AI marketing, autonomous pricing, or smart-valve control.

### Wave 1 — Response reliability and action center

**Outcome:** A high-severity operational signal reliably reaches the right person, receives an accountable response, and is measured end-to-end.

**Build**

- Notification preferences; user/property/on-call contacts; escalation policies; acknowledgement deadlines; quiet hours; schedules/time zones; digest rules.
- Email/SMS/push provider adapter strategy, development outbox, provider webhook handling, delivery/bounce/failure states, recipient-specific deduplication, retries, and DLQ workflow.
- Unified action center over alerts, incidents, work orders, and data-quality issues: owner, priority, SLA, evidence, recommended action, approval, status, and outcome.
- Operational policies for when an alert is evidence versus when a person creates/merges/reopens an incident.
- Electricity-specific incident/diagnostic states to achieve parity with the existing water operational model.
- Service-level and outcome reporting: acknowledge time, time-to-containment, time-to-resolution, repeat incidents, cost, and avoided-loss hypotheses.

**Exit evidence**

- A configured critical scenario produces exactly one deduplicated notification per intended recipient, escalates after the configured deadline, and preserves delivery and acknowledgement history.
- Operators can distinguish alert, incident, work order, and resolved outcome without losing source evidence.
- No incident is automatically created merely because a generic alert occurred unless a separately approved policy says so.

### Wave 2 — Property digital twin, asset care, and PMS integration foundation

**Outcome:** The platform understands the property context necessary to operate maintenance, utilities, and resident workflows alongside the PMS.

**Build**

- Extend building/floor/unit hierarchy with spaces, asset/equipment registry, asset relationships, install/replace/remove history, warranty, vendor/trade, and document/media evidence.
- Generalize repair work orders into planned and reactive work: tasks, assignment, SLA, labor, materials, vendor quote/approval, completion verification, and root-cause/outcome labels.
- Preventive-maintenance plans, recurring schedules, checklists, inspections, mobile/offline technician workflows, evidence capture, and warranty follow-up.
- Initial PMS connector with tenant-safe identity mapping, full/import sync, delta/webhook sync where available, reconciliation dashboard, conflict rules, and synchronization health.
- Define authoritative fields: PMS owns resident/lease/ledger facts; our platform owns operational incidents, telemetry, normalized assets, workflows, decisions, and derived intelligence.
- Build a transparent building-health framework as component scores, not a black-box single number: utilities, critical assets, backlog/SLA, data quality, resident/service signals, occupancy/financial references where integrated.

**Exit evidence**

- A manager can trace a work order from asset/location, evidence, policy, vendor/technician work, cost reference, and completion outcome.
- A PMS synchronization issue is visible, recoverable, and cannot silently corrupt the canonical operational model.
- A building-health view drills from a score to weighted components, source freshness, and an action center query.

### Wave 3 — Real devices, gateways, and trustworthy telemetry

**Outcome:** One real-device pilot can send, diagnose, revoke, and replay normalized telemetry without changing dashboard or workflow contracts.

**Build**

- Device, gateway, installation, ownership, lifecycle, capability, credential/certificate, credential rotation/revocation, firmware/configuration metadata, and support diagnostics.
- HTTPS and one selected event transport adapter (MQTT or gateway upload) behind the canonical event envelope; do not add every protocol at once.
- Rate limits by credential/class; nonce/replay controls; clock-skew and late-data policy; offline buffering; schema validation; device provenance; quarantined invalid data.
- Ingestion inbox/outbox, DLQ, controlled replay, duplicate-safe processing, telemetry-quality grades, and operational dashboards.
- Device health and scheduled stale/outage lifecycle; device support runbooks; pilot provisioning and decommissioning.
- A narrowly scoped hardware pilot for water leak protection or submetering, with training, installation checklist, support ownership, and success metrics.

**Exit evidence**

- A pilot device is provisioned, ingests an idempotent reading through a real adapter, displays its provenance/quality/health, and can be revoked.
- A bad payload, replay attempt, disabled device, delayed event, and queue failure each produce a safe, observable outcome.
- No real device receives an unsafe command as a side effect of a dashboard action.

### Wave 4 — Utility financial operations and portfolio conservation intelligence

**Outcome:** Owners can explain utility cost and prioritize conservation using reproducible, qualified data.

**Build**

- Meter replacement lineage; reading-quality and correction policies; tariff plans with effective dates; fees/tier/time-of-use support where applicable.
- Shared-meter allocation rules with effective-dated unit assignment; occupancy/lease reference handling; estimate/final/reconciled labels.
- Controlled billing periods: draft, review, close, correction, reopen; immutable calculation snapshots; adjustments/credits; exports and audit.
- Water and energy baselines; expected-versus-actual analysis; weather/occupancy/context normalization where valid; data-completeness and confidence indicators.
- Portfolio comparison, EUI/WUI-style metrics, sustainability/emissions accounting only with documented methodology and data-quality caveats.
- ROI ledger tying leak prevention, maintenance work, and conservation recommendations to baselines, estimated impact, and verified outcome.

**Exit evidence**

- A closed sample period can be reproduced from source readings, tariff/allocation versions, corrections, and adjustments.
- A portfolio metric exposes its definition, boundaries, source coverage, and completeness rather than implying false precision.
- The product does not label a chargeback as a legally compliant tenant bill without jurisdiction-specific legal and operating approval.

### Wave 5 — Resident, technician, and leasing workflows

**Outcome:** Residents, prospects, leasing staff, and field teams get focused experiences with strict privacy boundaries and clear human ownership.

**Build resident and field first**

- Resident/household/authorized-occupant identity linked to PMS authority; unit-scoped authorization; consent/preferences; communication history; privacy/export/deletion controls.
- Resident web/mobile portal for service requests, status, notifications, utility views, approved documents, and issue reporting. Payments remain a processor/PMS integration reference first.
- Technician mobile experience: assigned work, offline checklists, photos, parts, safety information, escalation, completion proof, and knowledge retrieval.
- Amenity, package, guest, parking, pet, event, and community capabilities only after explicit customer demand and integration/operating ownership are established.

**Then build narrow leasing/marketing workflows**

- Lead and source/touchpoint model, deduplication, consent, attribution, response SLA, tour scheduling/calendar integration, and human follow-up queue.
- A grounded leasing assistant that answers only approved, real-time, property-scoped facts; discloses handoff; records sources; and creates a lead/tour workflow under policy.
- Campaign/ILS/CRM ingestion and reporting before automated content/spend changes. Include experiment design and attribution uncertainty.
- Integrate applications, screening, e-sign, leases, and ledgers with approved providers/PMS rather than recreating regulated systems.

**Exit evidence**

- A resident only sees their authorized household/unit records and all access is auditable.
- A technician can complete an offline inspection/work order and synchronize safely later.
- A prospective resident can receive a correct, source-grounded answer and book a tour, with a human escalation path.
- No assistant makes screening, leasing, or pricing decisions.

### Wave 6 — Decision intelligence and constrained automation

**Outcome:** Operators receive trusted recommendations that learn from outcomes, then can selectively enable low-risk automation.

**Build**

- Feature snapshots, model/rule registry, offline evaluation, online monitoring, drift/fairness testing, champion/challenger controls, rollout/rollback, and decision ledger.
- Explainable anomaly triage, failure-risk prediction, maintenance prioritization, staffing/parts forecasts, occupancy/turn risk, no-show propensity, and renewal-support insights.
- Constrained recommendation systems for marketing allocation and pricing, with explicit objectives, guardrails, approval, override, simulation, and experiment tracking.
- Copilots for maintenance triage, manager briefings, document extraction, knowledge retrieval, and customer support—each with narrow permission-aware tools and escalation.
- Closed-loop labels: alert true/false positive, diagnosis, repair effectiveness, first-time fix, resident feedback, conversion source, price acceptance, and cost outcome.

**Exit evidence**

- Every displayed recommendation shows scope, sources, freshness, confidence, explanation, version, approval status, and realized outcome when known.
- A model or prompt can be rolled back without corrupting history or disabling human workflows.
- Any automation is narrowly bounded, reversible, monitored, and disabled by policy on anomaly/failure.

### Wave 7 — Portfolio platform, enterprise administration, and ecosystem scale

**Outcome:** The system serves portfolios and enterprise customers without weakening tenancy, privacy, or operability.

**Build**

- Portfolio/owner/regional experiences, capital planning, investment scenarios, approved ESG reporting, and cross-property health/benchmark views.
- Enterprise identity: SSO, SCIM, MFA requirements, delegated administration, support impersonation controls, audit exports, data retention/legal holds, and regional/data-residency strategy where required.
- Integration platform: API keys/service accounts, OAuth where needed, webhook subscriptions, developer sandbox, integration certification, quotas, reconciliation, and health scorecard.
- SaaS operations: organization onboarding, bulk imports, entitlements, subscription/usage controls, customer health, support tooling, incident/status communications, and controlled data export.
- Public property website/CMS only as a strictly separated public projection. It must never expose operational, resident, meter, cost, incident, work-order, or unpublished data.

**Exit evidence**

- An enterprise administrator can provision/deprovision through SCIM or a documented equivalent; all scope changes are audited.
- A partner integration has a sandbox, contract tests, rate controls, webhook retry/replay behavior, and tenant-safe observability.
- Portfolio recommendations distinguish comparable properties, data coverage, normalization assumptions, and source lineage.

### Wave 8 — Safety-governed autonomy and advanced ecosystem options

**Outcome:** Limited closed-loop automation is possible only where policy, safety case, legal review, hardware reliability, and operator acceptance justify it.

**Potential capabilities, all separately approved**

- Smart-valve or building-control actions with safety case, resident impact assessment, emergency manual override, command acknowledgment, fail-safe mode, liability allocation, and independent audit.
- Advanced computer vision for inspections, only with explicit privacy, retention, bias, and human-review controls.
- Capital-replacement forecasting and project prioritization using validated asset, cost, condition, and outcome history.
- Governed aggregated benchmarks and cross-portfolio learning, subject to contracts and de-identification policy.

**Exit evidence**

- The automation has a documented safety case, operator approval, live monitoring, manual override, tested fail-safe behavior, and a post-incident review process.

## 9. Pilot strategy and measurable outcomes

### Recommended first pilots

| Pilot | Customer problem | Product scope | Measures |
|---|---|---|---|
| Leak-to-resolution reliability | Water loss and repair coordination | Existing utility/incident/work-order wedge plus Wave 1 reliability | detection-to-acknowledgement, time-to-containment, false-positive rate, repair cycle, avoided-loss estimate, user adoption |
| Asset and preventive-maintenance context | Repeated reactive repairs and poor equipment history | Wave 2 assets, planned work, inspections, PMS reference data | planned-vs-reactive ratio, overdue PM, first-time fix, downtime, cost/repeat failure |
| One real telemetry integration | Trust in device onboarding and data quality | Wave 3 device/gateway pilot | successful provisioning, data completeness/latency, duplicate/replay handling, support time, incident precision |

### Pilot operating rules

- Capture baseline data before promising savings or ROI.
- Define customer owner, operator users, support escalation, data source, installation scope, privacy expectations, and success thresholds before launch.
- Use a single high-value connector and a single hardware use case before generalizing.
- Compare a control/baseline period where feasible; record confounders such as occupancy, weather, construction, and policy change.
- Review results with customers; convert only validated lessons into product claims or automation expansion.

## 10. Key risks and agreed mitigations

| Risk | Mitigation decision |
|---|---|
| Big-bang PMS replacement consumes years before differentiation | Integrate first; preserve clear system-of-record boundaries |
| “AI” becomes opaque, unsafe, or legally risky | Governed layers, decision ledger, human approval, model evaluation, and policy controls |
| Hardware data is unreliable or expensive to support | Pilot one protocol/use case; define device lifecycle, provenance, quality, replay, and support diagnostics before expansion |
| Cross-tenant leakage or improper model training | Organization/property authorization, tenant-scoped retrieval, contracts, de-identification, audit, and no casual pooling |
| Billing/chargeback creates legal/compliance exposure | Reproducible calculation/audit first; legal and jurisdiction review before tenant billing claims |
| Dashboard sprawl without action | Action center and transparent drill-down are required for every significant health/insight view |
| False precision in benchmarks and scores | Publish metric definition, inputs, freshness, confidence, coverage, and caveats |
| Automation harms residents or operations | Recommendation -> approval -> constrained automation progression, reversible actions, safety case for physical controls |
| Integration fragility degrades trust | Adapters, contracts, reconciliation, observability, idempotency, replay, and sandbox certification |
| Current baseline weakens while new scope grows | Wave 0 release readiness and one active major wave at a time |

## 11. Decision log

| ID | Decision | Status | Rationale |
|---|---|---|---|
| D-01 | Evolve, do not replace, the existing smart-utilities platform | Adopted | It already provides a differentiated operational wedge |
| D-02 | Position the product as an integration-first intelligence/action layer alongside PMS/accounting | Adopted | Reduces risk and accelerates validated value |
| D-03 | Preserve organization as tenant boundary and add property scope rather than weakening tenancy | Adopted | Existing safety foundation and necessary enterprise control |
| D-04 | Use a time-aware property/asset graph as the canonical operational model | Adopted | Enables utility, maintenance, resident, and portfolio workflows without fragmented objects |
| D-05 | Keep immutable readings and normalized protocols behind domain contracts | Adopted | Protects telemetry integrity and future device optionality |
| D-06 | Treat alerts as evidence; require explicit policy or human choice for incident creation | Adopted | Avoids unsafe or noisy automatic operational escalation |
| D-07 | Build response reliability and PMS/asset foundation before broad leasing/AI expansion | Adopted | Closes trust gaps and supports the most proven workflow |
| D-08 | Build AI in governed layers with decision/outcome lineage and human approval | Adopted | Needed for trust, legal safety, and learning |
| D-09 | Do not automatically change rents, eligibility, payments, safety controls, or high-cost actions | Adopted | High-impact decisions need legal, policy, and human control |
| D-10 | Treat revenue/savings/time claims in the supplied documents as hypotheses | Adopted | No baseline/method/evidence was provided |
| D-11 | Make public CMS/property sites a separate security projection | Adopted | Operational and resident data must stay private |
| D-12 | Start with one real device type/protocol and one high-value pilot | Adopted | Proves support and quality before protocol sprawl |
| D-13 | Set final ICP subsegment, PMS vendor, and first connector through discovery | Open decision | It materially affects workflow and investment choices |
| D-14 | Decide whether/when to offer resident chargeback/billing after legal review | Deferred | Jurisdiction, accounting, and consumer rules vary |
| D-15 | Decide whether/when to add computer vision/security and smart-valve controls | Deferred | Requires distinct privacy/safety/compliance cases |

## 12. Documentation and execution governance

1. Keep this roadmap as the whole-system decision record until it is accepted and reconciled with the governing MVP design and `docs/product-roadmap.md`.
2. Before each wave, create a focused design specification with customer evidence, exact scope, data contracts, authorization model, error/degradation behavior, acceptance criteria, and non-goals.
3. After design approval, create an implementation plan broken into independently testable tasks; execute with TDD, API/UI regression coverage, tenant-isolation tests, and manual verification instructions.
4. Maintain one major delivery wave in progress. Smaller security/reliability fixes may proceed only when they do not create a competing product program.
5. At every pilot/release decision, update: scope, customer evidence, assumptions, metrics, legal/compliance decisions, risks, and status.
6. Do not represent a roadmap item as released because a dashboard or schema exists. Use the exit evidence in this document and a production-appropriate verification record.

## 13. Immediate next action

Approve or revise the strategic decisions in Sections 3, 5, 6, and 8. Once accepted, the next detailed specification should be **Wave 0: Product Contract and Release Readiness**, followed by the existing **Response Reliability** design where it remains aligned. No new product implementation should begin from the broader multifamily vision until the affected wave has its own approved design and implementation plan.
