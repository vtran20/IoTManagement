---
name: iot-utilities-saas
description: Use when working in the IoTManagement repository on smart utilities SaaS architecture, planning, implementation, dashboard UI, NestJS REST APIs, simulated meters, ingestion, alerts, reports, mobile app planning, project rules, or design-spec updates.
---

# IoT Utilities SaaS

## Overview

Use this skill to keep work in the IoTManagement repository aligned with the approved smart water and electric utilities SaaS design. It reinforces the required Superpowers workflow, architecture defaults, tenant-safety rules, and dashboard expectations.

## First Steps

Before acting:

1. Read `AGENTS.md`.
2. Read `docs/superpowers/specs/2026-06-29-iot-utilities-saas-design.md`.
3. Check `git status --short`.
4. Choose the applicable Superpowers skill before changing files.

## Required Superpowers Routing

- Product, architecture, API, UI, data model, automation, or behavior changes: use `superpowers:brainstorming`.
- Approved design to implementation plan: use `superpowers:writing-plans`.
- Feature, bug fix, refactor, or behavior change implementation: use `superpowers:test-driven-development`.
- Failed tests, broken behavior, integration issues, or surprising results: use `superpowers:systematic-debugging`.
- Completion claims: use `superpowers:verification-before-completion`.
- Substantial implementation handoff: use `superpowers:requesting-code-review`.
- Review feedback: use `superpowers:receiving-code-review`.

Do not implement production code before design and planning checkpoints are satisfied, unless the user explicitly asks for a throwaway experiment.

## Architecture Defaults

- Use a TypeScript monorepo.
- Backend: NestJS REST API under `/api/v1`.
- Dashboard: Next.js, Tailwind CSS, shadcn/ui, TanStack Query, TanStack Table, and Recharts.
- Future mobile: Expo React Native.
- Database: PostgreSQL first; TimescaleDB later if reading volume requires it.
- Jobs: Redis and BullMQ.
- Deployment: Kubernetes with Kustomize base/overlay manifests for API, dashboard, workers, migration Jobs, Services, Ingress, Secrets, ConfigMaps, health probes, and autoscaling-ready manifests.
- Device path: simulated meters first; real devices later through the same normalized ingestion contract.

## Domain Guardrails

- Scope customer data by `organizationId`.
- Support owner, manager, viewer, and future tenant roles.
- Support unit-level meters and building-level shared meters.
- Keep raw meter readings immutable after ingestion.
- Make reading ingestion idempotent by meter and measured timestamp.
- Normalize all protocols into `MeterReading`; keep MQTT, gateway, Modbus, LoRaWAN, Zigbee, Wi-Fi, and cellular details out of dashboard-facing code.
- Separate user auth from device/gateway credentials.

## API Guardrails

- Validate all request bodies with DTO schemas.
- Derive organization scope from authenticated membership whenever possible.
- Add OpenAPI documentation for REST endpoints.
- Shape dashboard endpoints around product questions: usage, cost, alerts, device health, rankings, and trends.
- Add tests for tenant isolation, ingestion validation, duplicate handling, and alert evaluation.

## Dashboard Guardrails

- Build the real working dashboard as the first screen after login.
- Keep the interface operational, calm, dense, and easy to scan.
- Strictly follow the shadcnblocks admin dashboard reference for shell UI: white left sidebar, compact grouped navigation, small line icons, chevrons for expandable/secondary rows, slim top bar, dark mobile drawer backdrop, 284px mobile drawer width, and bottom account block.
- For mobile/tablet, never hide navigation without a reference-style drawer or sidebar trigger. The drawer must close through the trigger, Escape, and outside/backdrop click.
- Prefer real lucide icons over CSS-drawn pseudo-icons. Do not create bordered pseudo-icons with `::before`/`::after`.
- Prevent text/data overlap in charts with realistic labels, especially building and unit names. Reserve label space on desktop and stack label above chart marks on mobile.
- Include loading, empty, error, and stale-data states.
- Use tables for units, meters, alerts, and reports.
- Use charts for utility usage, cost, anomalies, comparisons, and trends.

## Completion Checklist

Before reporting success:

- For every production behavior change, add or update focused unit tests and a regression test at the appropriate boundary. The regression test must exercise the existing workflow that could regress; unit-only coverage is insufficient.
- Run the new or updated unit and regression tests after implementation. If a change is documentation-only or otherwise non-testable, explicitly document the exception.
- Confirm the relevant Superpowers verification step was used.
- Run focused tests or explain why tests are not available yet.
- Add a "Manual verification" section after each phase with concrete steps the user can run locally.
- Include expected results for manual checks, such as dashboard URL behavior, API response shape, Kubernetes pod status, logs, or sample command output.
- Check `git status --short`.
- Mention changed files and verification performed.
