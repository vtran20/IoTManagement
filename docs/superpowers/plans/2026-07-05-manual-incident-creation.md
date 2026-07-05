# Manual Incident Creation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let owners and managers create a tenant-scoped manual water incident from the Incidents page.

**Architecture:** Add a focused client component beside the incident queue. It loads the existing portfolio resources, filters unit and meter choices by building, posts the existing manual-incident request, and redirects to the created incident detail page. The Nest API remains unchanged because it already provides authorization and relationship validation.

**Tech Stack:** Next.js, React, TypeScript, TanStack Query, existing REST client, Playwright.

---

## Chunk 1: Dashboard Creation Flow

### Task 1: Specify the expected behaviour in browser tests

**Files:**
- Create: `apps/web-dashboard/tests/manual-incidents.spec.ts`
- Modify: `apps/web-dashboard/tests/auth-fixture.ts`

- [x] **Step 1: Write an owner workflow test**

Mock buildings, units, meters, CSRF, and `POST /incidents/manual`. Visit `/incidents`, open the form, select the building context, submit, and assert the request payload and navigation to the created detail route.

- [x] **Step 2: Write a viewer restriction test**

Mock a viewer session and assert that the create action is absent.

- [x] **Step 3: Run the focused test to verify it fails**

Run: `pnpm --filter @iot-management/web-dashboard test:e2e -- manual-incidents.spec.ts`

Expected: FAIL because the create action is not implemented.

### Task 2: Build the focused incident-creation component

**Files:**
- Create: `apps/web-dashboard/features/incidents/manual-incident-creation.tsx`
- Modify: `apps/web-dashboard/app/incidents/page.tsx`
- Modify: `apps/web-dashboard/app/styles.css`

- [x] **Step 1: Add the role-aware create action and form**

Use the existing session hook and `canMutate`. Add required title, description, building, and severity fields; include optional unit and meter selects.

- [x] **Step 2: Load and scope context options**

Fetch existing buildings, units, and meters. Changing building clears incompatible unit/meter selections and restricts options to the chosen building.

- [x] **Step 3: Submit through the existing API contract**

Call `mutateJson` with `POST /incidents/manual`; omit empty optional IDs. On success, redirect to `/incidents/:incidentId`; on failure, show the existing form-error treatment.

- [x] **Step 4: Add only scoped layout styles**

Use existing tokens and responsive form conventions. Ensure controls wrap naturally on tablet and mobile without changing the incident table.

- [x] **Step 5: Re-run focused browser tests**

Run: `pnpm --filter @iot-management/web-dashboard test:e2e -- manual-incidents.spec.ts`

Expected: PASS.

## Chunk 2: Regression And Handoff

### Task 3: Verify the dashboard and existing API workflow

**Files:**
- Test: `apps/web-dashboard/tests/manual-incidents.spec.ts`
- Test: `apps/api/test/incidents.e2e-spec.ts`

- [x] **Step 1: Run dashboard quality checks**

Run: `pnpm --filter @iot-management/web-dashboard lint && pnpm --filter @iot-management/web-dashboard typecheck && pnpm --filter @iot-management/web-dashboard test:e2e`

- [x] **Step 2: Run focused API regression coverage**

Run: `pnpm --filter @iot-management/api test -- incidents.e2e-spec.ts`

- [x] **Step 3: Build the dashboard**

Run: `pnpm --filter @iot-management/web-dashboard build`

- [x] **Step 4: Commit the implementation**

Run: `git add apps/web-dashboard docs/superpowers && git commit -m "feat: add manual incident creation"`

## Manual Verification

1. Start the API and dashboard with the local setup documented in `docs/deployment/local.md`.
2. Sign in at `http://localhost:3000/login` as `owner@north.example`.
3. Open `http://localhost:3000/incidents`, select **Create incident**, choose a building, then optionally choose a matching unit or meter.
4. Enter a warning or critical severity, title, and description; submit the form.
5. Expected: the dashboard opens `/incidents/<new-id>` and the incident has source `manual report` and status `open`.
6. Sign in as `viewer@north.example` and revisit `/incidents`.
7. Expected: the incident queue remains visible, but there is no create action or editable form.
