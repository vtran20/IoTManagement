# IoT Utilities SaaS Project Rules

Use this rule file for quick project alignment before planning or implementation.

## Mandatory Process

1. Read `AGENTS.md`.
2. Read `docs/superpowers/specs/2026-06-29-iot-utilities-saas-design.md` for product and architecture context.
3. Use Superpowers before acting:
   - Brainstorming for design, product, architecture, API, UI, or behavior changes.
   - Writing plans before implementation.
   - Test-driven development for features and bug fixes.
   - Systematic debugging for failures.
   - Verification before completion before reporting success.

## Architecture Commitments

- SaaS tenant boundary is `Organization`.
- Backend is NestJS REST API under `/api/v1`.
- Web dashboard is Next.js with Tailwind CSS and shadcn/ui.
- Simulated meters use the same ingestion path as future real devices.
- PostgreSQL is the first database; TimescaleDB is a later scaling option.
- Redis and BullMQ handle async simulation, aggregation, alerting, and reporting jobs.
- Kubernetes is the target deployment platform for API, dashboard, workers, migration Jobs, ingress, Secrets, ConfigMaps, and runtime health checks; use Kustomize base/overlay manifests by default.

## Product Commitments

- MVP customer: apartment and building owners.
- MVP data: simulated water and electric readings.
- MVP experience: operational dashboard for buildings, units, meters, alerts, reports, and settings.
- Future experience: Expo mobile app for management and alert workflows.

## Safety Rules

- Never bypass organization scoping.
- Never mix user auth credentials with device ingestion credentials.
- Validate all external input.
- Keep raw readings immutable.
- Keep device-specific protocols out of dashboard-facing APIs.
