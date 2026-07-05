# Local Regression Gate

The local regression gate runs release checks without using the development
PostgreSQL database, Redis instance, ports, or application processes.

## Prerequisites

- Node.js and pnpm, with dependencies installed through `pnpm install`.
- Docker Desktop or Rancher Desktop running locally.
- Playwright Chromium installed with `pnpm exec playwright install chromium`.

## Commands

Run the fast developer gate:

```bash
pnpm qa:fast
```

This creates a temporary Docker Compose project with PostgreSQL and Redis,
builds the workspace, runs lint/type/unit tests, runs API e2e tests against an
isolated database schema, and runs the mocked dashboard Playwright suite.

Run the release candidate gate:

```bash
pnpm qa:release
```

The release gate additionally migrates and seeds disposable data, starts the
compiled API, worker, and dashboard on random localhost ports, checks API and
worker health, validates HTTP-client coverage, and runs real browser workflows
against the live stack.

Both commands remove the temporary containers, network, and volumes even when
a test fails. They never call an external AI service.

## Failure evidence and AI assistance

On failure, inspect the timestamped bundle in `.qa-artifacts/`. It contains
the run context, command logs, API and worker logs, and Playwright traces,
screenshots, video, and HTML report when a browser test failed.

Ask Codex to analyze the specific artifact directory, for example:

```text
Analyze the failure bundle in .qa-artifacts/<run-id> and identify the first failing request and likely root cause.
```

Successful runs delete their temporary artifact directory automatically.

## Expected release coverage

- Owner dashboard metrics and meter detail navigation use the live API.
- Manager-created portfolio data persists after a browser reload.
- Seeded high-usage alert acknowledgement and resolution persist.
- Viewer workflows remain read-only and can download a seeded monthly report.
- The API e2e suite continues to enforce ingestion, migration, role, and
  tenant-isolation behavior.
