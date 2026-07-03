# IntelliJ HTTP Client Suite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide editable IntelliJ HTTP Client requests for every current REST endpoint, with safe environment templates and reusable authorization/resource variables.

**Architecture:** Use modular `.http` files under `http/`, a committed non-secret environment file for URLs and demo identities, and an ignored private environment file for passwords and external tokens. Login response handlers set global bearer-token variables; create requests capture IDs for later requests.

**Tech Stack:** IntelliJ IDEA Built-in HTTP Client, JSON environments, repository documentation.

---

### Task 1: Environment And Safety

- [x] Add `http-client.env.json`, `http-client.private.env.json.example`, and `.gitignore` protection for local credentials.
- [x] Add a README that explains environments, token capture, request order, and destructive requests.

### Task 2: Request Coverage

- [x] Add modular requests for health/OpenAPI/auth, portfolio/meters/readings, dashboard/analytics/alerts, memberships/invitations/settings, simulations/reports/audit/dev outbox, and the water-response modules.
- [x] Capture login tokens and created resource IDs with built-in response-handler scripts.
- [x] Include each current REST controller endpoint at least once.

### Task 3: Verification And Checkpoint

- [x] Validate request coverage against controller route declarations.
- [x] Review environment safety and commit the suite.
