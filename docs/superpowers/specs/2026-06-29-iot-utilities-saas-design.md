# Smart Utilities SaaS Design Spec

Date: 2026-06-29
Status: Draft for user review

## Purpose

Build a SaaS platform for apartment and building owners to monitor smart water and electric utility usage across buildings, floors, units, and meters. The first version uses simulated meter data plus a production-shaped REST ingestion API, so the dashboard, data model, tenant isolation, alerts, and reporting can be validated before connecting real devices.

## Target Customer

The MVP targets apartment and building owners who need to:

- Track water and electricity usage by building, floor, unit, and meter.
- Detect abnormal usage such as leaks, spikes, stale meters, or possible outages.
- Estimate utility cost by unit and building.
- View operational status of meters.
- Prepare monthly usage reports.

The design should also support future property manager and tenant-facing workflows without requiring a rewrite.

## Product Scope

### MVP Included

- Multi-tenant SaaS account model.
- Building, floor, unit, and meter management.
- Simulated water and electric meter readings.
- REST API for data ingestion.
- Dashboard summary, trends, and unit-level usage.
- Basic alert rules and alert events.
- Device health states based on last received reading.
- Estimated cost using configurable water and electric rates.
- Role-based user access for owners, managers, and viewers.

### MVP Excluded

- Direct real-device onboarding.
- Native mobile app.
- Billing and subscription payments.
- Tenant billing statements.
- Advanced machine-learning anomaly detection.
- Direct control of devices or shutoff valves.

These are planned as later phases once the core SaaS and data model are stable.

## Recommended Technical Stack

### Monorepo

Use a TypeScript monorepo so the web app, backend API, future mobile app, shared types, and API client can evolve together.

```text
apps/
  api/              NestJS REST API
  web-dashboard/    Next.js SaaS dashboard
  mobile-app/       Expo React Native app, added later

packages/
  api-client/       Typed REST client shared by web and mobile
  types/            Shared API and domain types
  config/           Shared linting, TypeScript, and formatting config
  ui/               Shared design tokens and selected UI primitives
```

### Frontend Dashboard

Use Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, TanStack Table, and Recharts.

Rationale:

- Next.js gives the SaaS dashboard a mature React foundation with layouts, routing, server/client rendering options, and deployment flexibility.
- shadcn/ui provides accessible dashboard components while keeping component code customizable.
- Tailwind CSS keeps styling consistent and fast to iterate.
- TanStack Query handles REST API fetching, caching, refreshing, loading states, and mutation flows.
- TanStack Table supports dense operational tables for units, meters, alerts, and reports.
- Recharts is sufficient for MVP time-series and comparison charts.

### Backend API

Use NestJS with TypeScript.

Rationale:

- Strong modular structure for a SaaS backend.
- Good fit for REST APIs, validation, guards, interceptors, dependency injection, and OpenAPI documentation.
- Shared TypeScript types can reduce frontend/backend drift.
- Can later add MQTT ingestion workers or message consumers without replacing the API.

### Data Storage

Use PostgreSQL for the MVP.

Recommended progression:

1. Start with standard PostgreSQL tables for application data and readings.
2. Add TimescaleDB when readings volume grows or dashboard queries need time-series optimization.
3. Keep summarized daily and monthly aggregates to avoid repeatedly scanning raw readings.

### Jobs and Async Processing

Use Redis and BullMQ for background jobs.

Initial jobs:

- Generate simulated readings.
- Aggregate raw readings into hourly, daily, and monthly summaries.
- Evaluate alert rules.
- Mark devices stale when they stop sending readings.
- Generate scheduled reports later.

### Kubernetes Deployment

Use Kubernetes as the target deployment platform. Local development can still use Docker Compose for PostgreSQL and Redis, but non-production and production environments should run containerized workloads on Kubernetes.

Kubernetes workloads:

- API deployment: NestJS REST API pods.
- Web deployment: Next.js dashboard pods.
- Worker deployment: BullMQ workers for simulation, aggregation, alert evaluation, stale-device checks, and reports.
- Migration job: one-shot database migration Job that runs before API rollout.
- Optional scheduled jobs: CronJobs for report generation, device stale checks, and periodic maintenance.

Kubernetes platform components:

- Services for internal API, web, PostgreSQL, and Redis connectivity.
- Ingress for external HTTPS access to the dashboard and API.
- ConfigMaps for non-secret runtime configuration.
- Secrets for database credentials, Redis credentials, JWT/session secrets, and future device-ingestion credentials.
- Readiness and liveness probes for API and web pods.
- Resource requests and limits for all workloads.
- Horizontal Pod Autoscalers for API, web, and workers once traffic patterns are known.
- NetworkPolicies to restrict database and Redis access to approved workloads.

Recommended environment progression:

1. Local development: Docker Compose for PostgreSQL and Redis, local API and web dev servers.
2. Local Kubernetes validation: kind or minikube with the same manifests used by non-production.
3. Non-production: managed Kubernetes namespace with external managed PostgreSQL and Redis preferred.
4. Production: managed Kubernetes with managed PostgreSQL, managed Redis, TLS ingress, backup/restore, monitoring, and alerting.

## Architecture

The MVP uses a modular monolith backend with clean domain boundaries. This is simpler than microservices and easier to build, while still leaving clear extraction paths later.

```text
Kubernetes ingress
  -> Next.js dashboard service
  -> NestJS REST API service
      -> validation and tenant/device lookup
      -> PostgreSQL raw readings and app data
      -> Redis/BullMQ queues
          -> worker pods for simulation, aggregation, alerts, and reports
```

Backend modules:

- Auth module: login, session/JWT handling, password hashing, role checks.
- Tenant module: organizations, memberships, roles, tenant isolation.
- Portfolio module: buildings, floors, units.
- Meter module: meter records, meter type, status, assignment to unit/building.
- Ingestion module: normalized reading intake and validation.
- Simulation module: generates realistic water and electric readings.
- Analytics module: usage summaries, trends, cost estimates, high-usage rankings.
- Alert module: alert rules, alert evaluation, alert events.
- Dashboard module: read-optimized endpoints for web and future mobile clients.

## SaaS Tenancy and Access Control

Every customer is represented by an organization. All core records belong to an organization.

Roles:

- Owner: full organization control, users, buildings, meters, alerts, reports.
- Manager: manage buildings, meters, alerts, and view reports.
- Viewer: read-only dashboard and report access.
- Tenant: future role for unit-level access only.

Best practices:

- All queries must be scoped by organization ID.
- Never accept organization ID from untrusted request bodies when it can be derived from authenticated membership.
- Enforce role checks at API boundaries.
- Add database indexes on organization-scoped foreign keys.

## Core Data Model

```text
Organization
  id
  name
  status
  createdAt

User
  id
  email
  name
  passwordHash
  createdAt

Membership
  id
  organizationId
  userId
  role

Building
  id
  organizationId
  name
  address
  timezone

Floor
  id
  organizationId
  buildingId
  name
  level

Unit
  id
  organizationId
  buildingId
  floorId
  name
  occupancyStatus

Meter
  id
  organizationId
  buildingId
  floorId
  unitId
  type              water | electric
  source            simulated | gateway | direct_api | mqtt
  externalId
  status            online | offline | stale | disabled
  installedAt
  lastReadingAt

MeterReading
  id
  organizationId
  meterId
  measuredAt
  utilityType       water | electric
  value
  unit              gallon | liter | kwh
  readingKind       cumulative | interval
  quality           good | estimated | duplicate | invalid
  receivedAt

UsageAggregate
  id
  organizationId
  meterId
  buildingId
  unitId
  utilityType
  periodStart
  periodEnd
  periodType        hour | day | month
  usageValue
  costEstimate

AlertRule
  id
  organizationId
  name
  utilityType
  scopeType         organization | building | unit | meter
  scopeId
  conditionType     high_usage | leak_suspected | stale_device | outage_suspected
  threshold
  windowMinutes
  enabled

AlertEvent
  id
  organizationId
  alertRuleId
  meterId
  buildingId
  unitId
  severity          info | warning | critical
  status            open | acknowledged | resolved
  message
  triggeredAt
  resolvedAt
```

## REST API Design

Use `/api/v1` versioning from the start.

### Auth and Tenant

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
GET    /api/v1/organizations/current
GET    /api/v1/memberships
POST   /api/v1/memberships
```

### Portfolio Management

```text
GET    /api/v1/buildings
POST   /api/v1/buildings
GET    /api/v1/buildings/:buildingId
PATCH  /api/v1/buildings/:buildingId

GET    /api/v1/floors
POST   /api/v1/floors

GET    /api/v1/units
POST   /api/v1/units
GET    /api/v1/units/:unitId
PATCH  /api/v1/units/:unitId
```

### Meters and Readings

```text
GET    /api/v1/meters
POST   /api/v1/meters
GET    /api/v1/meters/:meterId
PATCH  /api/v1/meters/:meterId

POST   /api/v1/readings/ingest
GET    /api/v1/meters/:meterId/readings
```

Initial ingestion payload:

```json
{
  "meterExternalId": "sim-water-unit-101",
  "measuredAt": "2026-06-29T12:00:00Z",
  "utilityType": "water",
  "value": 12844.25,
  "unit": "gallon",
  "readingKind": "cumulative"
}
```

Rules:

- `meterExternalId` maps to one known meter inside one organization.
- Duplicate readings with the same meter and measured timestamp are ignored or marked duplicate.
- Invalid units, negative values, unknown meters, or stale timestamps are rejected.
- All accepted readings update `Meter.lastReadingAt`.

### Simulation

```text
POST   /api/v1/simulations/run
POST   /api/v1/simulations/start
POST   /api/v1/simulations/stop
GET    /api/v1/simulations/status
```

Simulation behavior:

- Generate water and electric readings per meter.
- Support normal usage curves by time of day.
- Include controlled anomalies such as leaks, spikes, and offline meters.
- Send data through the same ingestion path used by real devices.

### Dashboard and Analytics

```text
GET    /api/v1/dashboard/summary
GET    /api/v1/dashboard/usage-trends
GET    /api/v1/dashboard/building-breakdown
GET    /api/v1/dashboard/unit-rankings
GET    /api/v1/dashboard/device-health

GET    /api/v1/analytics/usage
GET    /api/v1/analytics/cost-estimates
GET    /api/v1/analytics/anomalies
```

### Alerts

```text
GET    /api/v1/alert-rules
POST   /api/v1/alert-rules
PATCH  /api/v1/alert-rules/:ruleId

GET    /api/v1/alerts
POST   /api/v1/alerts/:alertId/acknowledge
POST   /api/v1/alerts/:alertId/resolve
```

## Dashboard UX

The dashboard should feel like an operational SaaS tool, not a marketing site. The first screen after login is the working dashboard.

Primary navigation:

- Overview
- Buildings
- Units
- Meters
- Alerts
- Reports
- Settings

Overview page:

- Total water usage for selected period.
- Total electricity usage for selected period.
- Estimated utility cost.
- Active alerts.
- Online/stale/offline meter counts.
- Usage trend chart.
- Building comparison chart.
- Highest-usage units table.

Buildings page:

- Building list with usage, cost, active alerts, and device health.
- Building detail view with floors, units, meters, and trends.

Units page:

- Searchable table of units.
- Water and electricity usage per unit.
- Cost estimate per unit.
- Alert status per unit.

Meters page:

- Meter inventory.
- Meter type, source, assignment, status, last reading time.
- Recent reading chart per meter.

Alerts page:

- Open, acknowledged, and resolved alerts.
- Severity, affected unit/building/meter, trigger reason, timestamp.
- Acknowledge and resolve actions.

Reports page:

- Monthly usage by building and unit.
- Export can be added after core reporting is stable.

## Future Mobile App

Use Expo React Native when mobile is added.

Mobile app priorities:

- Push notifications for critical alerts.
- Alert acknowledgment and resolution.
- Building and meter health view.
- Basic usage summary.
- Quick contact/escalation workflow for maintenance teams.

The mobile app should use the same REST API and shared `api-client` package as the web dashboard.

## Future Real Device Connectivity

The backend should not care whether a reading came from simulation, a gateway, or a direct device API. All sources should produce the same normalized reading shape.

Recommended future path:

```text
Smart meter or sensor
  -> local gateway or device hub
    -> MQTT or HTTPS
      -> ingestion service
        -> normalized MeterReading
          -> storage, aggregation, alerts, dashboard
```

Likely device/protocol options:

- MQTT for event-driven IoT messaging.
- HTTPS for simple direct device or gateway posting.
- Modbus for industrial meters through a gateway.
- LoRaWAN for long-range low-power meters.
- Zigbee or Wi-Fi for building-local devices through a hub.
- Cellular meters for sites without reliable local network access.

Device security requirements for later phases:

- Per-device credentials or certificates.
- Device registry with revocation.
- TLS for transport.
- Replay protection using timestamps and nonce/idempotency keys.
- Rate limiting and payload validation.
- Separate ingestion credentials from user credentials.

## Alerting Rules

MVP alert types:

- High usage: usage exceeds threshold within a configured window.
- Leak suspected: water usage continues during expected idle hours.
- Stale device: no reading received after expected interval.
- Outage suspected: electric reading stops or drops unexpectedly for one or more meters.

Alert lifecycle:

```text
open -> acknowledged -> resolved
```

## Data Processing

Raw readings are stored first, then processed asynchronously.

Processing flow:

1. Validate and store raw reading.
2. Update meter health fields.
3. Queue aggregation job.
4. Aggregate usage into hourly, daily, and monthly summaries.
5. Evaluate alert rules.
6. Update dashboard read models or cached summaries.

This keeps ingestion fast and lets dashboard queries use precomputed summaries.

## Security and Reliability

Security practices:

- Hash passwords with a modern password hashing algorithm.
- Use HTTP-only secure cookies or well-managed JWT sessions.
- Enforce organization scoping in every service method.
- Validate all request bodies with DTO schemas.
- Generate OpenAPI documentation from backend decorators.
- Use structured logs without secrets.
- Keep ingestion credentials separate from user auth.

Reliability practices:

- Make ingestion idempotent by meter ID and measured timestamp.
- Keep raw readings immutable after acceptance.
- Use background retries for aggregation and alert jobs.
- Add health checks for API, database, and Redis.
- Track stale devices using last reading time.
- Add database migrations from the beginning.
- Use Kubernetes readiness probes so traffic is only sent to ready API and web pods.
- Use Kubernetes liveness probes to restart unhealthy API, web, and worker pods.
- Run migrations through Kubernetes Jobs, not ad hoc shell commands against production.
- Store secrets in Kubernetes Secrets or an external secret manager, never in ConfigMaps.

## Testing Strategy

Backend:

- Unit tests for domain services.
- Integration tests for REST endpoints.
- Tests for tenant isolation.
- Tests for ingestion validation and duplicate handling.
- Tests for alert rule evaluation.

Frontend:

- Component tests for dashboard cards, tables, and alert actions.
- API mocking for loading, error, and empty states.
- End-to-end tests for login, dashboard view, meter creation, simulation run, and alert acknowledgment.

Simulation:

- Deterministic seeded data generation.
- Tests for normal curves, high usage, leaks, and offline meters.

## Phased Roadmap

### Phase 1: Foundation

- Monorepo setup.
- NestJS API.
- Next.js dashboard.
- PostgreSQL schema and migrations.
- Auth and organization model.
- Building, unit, and meter CRUD.

### Phase 2: Simulated Readings

- Meter simulator.
- REST ingestion endpoint.
- Raw readings storage.
- Usage aggregation jobs.
- Dashboard summary and trends.

### Phase 3: Alerts and Reports

- Alert rules.
- Alert evaluation jobs.
- Alert event workflow.
- Monthly usage reports.
- Cost estimate model.

### Phase 4: Kubernetes Productionization

- Container images for API, web dashboard, and workers.
- Kustomize base and environment overlays for Kubernetes manifests.
- Helm chart can be considered later if packaging requirements grow.
- Migration Job.
- Services and Ingress.
- ConfigMaps and Secrets.
- Health probes, resource requests, and resource limits.
- Local kind/minikube validation.
- Non-production namespace deployment.
- Production deployment runbook.

### Phase 5: Mobile App

- Expo app.
- Shared API client.
- Login and organization context.
- Alert notifications and acknowledgement.
- Basic usage and device health screens.

### Phase 6: Real Device Integration

- Device registry and credentials.
- Gateway ingestion.
- MQTT ingestion option.
- Real meter onboarding flow.
- Device diagnostics and command audit log.

## Key Design Decisions

- Start with simulated data but use a real ingestion API so the product is not throwaway.
- Use REST for the main product API because it is simple, documented, testable, and easy for web/mobile clients.
- Use a modular monolith first, not microservices.
- Use PostgreSQL first and add TimescaleDB when time-series volume requires it.
- Use Next.js and shadcn/ui for a professional SaaS dashboard.
- Use Expo later for the management and alert mobile app.
- Keep all device-specific protocols behind a normalized meter reading contract.
- Use Kubernetes as the target runtime for non-production and production deployments.

## Default Implementation Assumptions

Use these defaults unless the product direction changes:

- Backend framework: NestJS with TypeScript.
- Web dashboard: Next.js, Tailwind CSS, shadcn/ui, TanStack Query, TanStack Table, and Recharts.
- MVP authentication: include real authentication and organization membership from the beginning.
- Meter assignment: support both unit-level meters and building-level shared meters.
- Device source: simulated meters first, with the ingestion API shaped for future real devices.
- Deployment platform: Kubernetes, with Docker Compose retained for local developer dependencies.
