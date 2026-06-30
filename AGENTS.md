# IoTManagement Agent Instructions

## Project Identity

This repository is for a smart water and electric utilities SaaS platform for apartment and building owners.

The current source of truth is:

- `docs/superpowers/specs/2026-06-29-iot-utilities-saas-design.md`

Read that design spec before making architecture, data model, API, dashboard, alerting, simulation, mobile, or device-ingestion decisions.

## Required Superpowers Workflow

Always use the relevant Superpowers workflow before acting:

- Use `superpowers:brainstorming` before creating or changing product behavior, architecture, UI, data model, API shape, automation, or major project conventions.
- Use `superpowers:writing-plans` after an approved design/spec and before implementation.
- Use `superpowers:test-driven-development` before implementing features, bug fixes, refactors, or behavior changes.
- Use `superpowers:systematic-debugging` for bugs, failed tests, unexpected behavior, broken dev servers, or integration issues.
- Use `superpowers:verification-before-completion` before claiming work is complete, fixed, passing, or ready.
- Use `superpowers:requesting-code-review` for substantial implementations before merge or handoff.
- Use `superpowers:receiving-code-review` before applying review feedback.

Do not scaffold or implement product code before the design/spec and plan steps are complete unless the user explicitly asks for a throwaway experiment.

## Architecture Defaults

Use these defaults unless the user approves a design update:

- Monorepo layout with `apps/api`, `apps/web-dashboard`, future `apps/mobile-app`, and shared `packages/*`.
- Backend: NestJS with TypeScript.
- API style: REST under `/api/v1`, with OpenAPI documentation.
- Dashboard: Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, TanStack Table, and Recharts.
- Future mobile app: Expo React Native.
- Database: PostgreSQL first, with TimescaleDB considered later for high-volume readings.
- Background jobs: Redis and BullMQ.
- Deployment target: Kubernetes with Kustomize base/overlay manifests, containerized API, dashboard, worker, migration Job, ConfigMaps, Secrets, Services, Ingress, health probes, and autoscaling-ready manifests.
- Device strategy: simulated meter data first, real devices later through the same normalized ingestion contract.

## Domain Rules

- Treat `Organization` as the SaaS tenant boundary.
- Scope all customer-owned data by `organizationId`.
- Support both unit-level meters and building-level shared meters.
- Keep raw meter readings immutable after acceptance.
- Make ingestion idempotent by meter and measured timestamp.
- Keep device protocols behind a normalized `MeterReading` model.
- Separate user authentication from device or gateway credentials.
- Design for water and electricity from the start.

## API Rules

- Prefer DTO validation at every API boundary.
- Never trust client-supplied organization scope when it can be derived from authenticated membership.
- Use explicit role checks for owner, manager, and viewer workflows.
- Design endpoint responses for dashboard use, not only database shape.
- Add migration-backed schema changes with tests.

## UI Rules

- Build an operational SaaS dashboard, not a marketing landing page.
- Prioritize dense but readable layouts for repeated property-management work.
- Use the shadcnblocks admin dashboard reference for the visual direction: `https://shadcnblocks-admin.vercel.app/ecommerce/dashboard-1`. Match its calm left sidebar, slim top bar, rounded metric cards, bordered chart panels, compact spacing, and monochrome-first SaaS feel while adapting labels/data to smart utilities.
- Use accessible shadcn/ui components and lucide icons where appropriate.
- Include loading, empty, error, and stale-data states.
- Keep charts tied to real dashboard questions: usage, cost, anomalies, device health, and trends.

## Verification Rules

Before finishing any implementation:

- Run focused tests for the changed area.
- Run lint/type checks when available.
- Verify tenant isolation for backend changes that access organization data.
- Verify dashboard states for frontend changes.
- After each implementation phase, include a short "Manual verification" section with step-by-step commands or UI actions the user can run locally.
- Make manual verification practical for the current phase: include expected URLs, API endpoints, Kubernetes commands, sample inputs, and expected results when applicable.
- State exactly what was and was not verified.

## Git Hygiene

- Keep changes scoped to the task.
- Do not revert user changes unless explicitly requested.
- Commit design/spec checkpoints when the Superpowers workflow calls for it.
- Keep generated or local secrets out of git.
