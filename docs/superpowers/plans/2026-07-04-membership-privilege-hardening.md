# Membership Privilege Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce owner, manager, and viewer membership privileges consistently at API and dashboard boundaries.

**Architecture:** Keep generic authentication and controller guards unchanged. Add target-aware authorization and managed-role validation in `MembershipsService` and `InvitationsService`; expose only valid invitation roles in the Users dashboard.

**Tech Stack:** NestJS 11, TypeScript, PostgreSQL persistence, Next.js 16, Playwright, Vitest, Supertest.

---

### Task 1: Server-side membership target authorization

**Files:**
- Modify: `apps/api/src/tenants/memberships.service.ts`
- Modify: `apps/api/test/invitations.e2e-spec.ts`

- [ ] **Step 1: Write failing API tests**

Add a test where a manager token receives `403` for:

```ts
await request(app.getHttpServer())
  .post("/api/v1/memberships")
  .set("Authorization", `Bearer ${managerToken}`)
  .send({ email: "manager-created-owner@north.example", role: "owner" })
  .expect(403);

await request(app.getHttpServer())
  .post("/api/v1/memberships/membership_north_owner/disable")
  .set("Authorization", `Bearer ${managerToken}`)
  .expect(403);
```

In the same test, create a viewer membership and verify the manager can disable
and reactivate that viewer.

- [ ] **Step 2: Run the test and verify the current authorization gap**

```bash
corepack pnpm --filter @iot-management/api test:e2e -- invitations.e2e-spec.ts
```

Expected: the manager owner-creation or owner-disable request incorrectly
succeeds before the fix.

- [ ] **Step 3: Implement managed-role and target checks**

Add a `managedRoles` set containing `owner`, `manager`, and `viewer`. Reject
other requested roles with `VALIDATION_FAILED`. In `MembershipsService`:

```ts
private assertCanManageTarget(
  context: RequestContext,
  membership: { role: UserRole },
): void {
  if (context.membership.role === "manager" && membership.role !== "viewer") {
    throw new ApiError(
      "MEMBERSHIP_ROLE_FORBIDDEN",
      "Managers can only manage viewer memberships",
      HttpStatus.FORBIDDEN,
    );
  }
}
```

Call it after tenant membership lookup in `updateRole`, `disable`, and
`reactivate`. For `create`, validate the requested role and reject manager
creation unless the requested role is `viewer`. Restrict role changes to owner
actors; retain last-owner protection.

- [ ] **Step 4: Run focused API tests and verify they pass**

```bash
corepack pnpm --filter @iot-management/api test:e2e -- invitations.e2e-spec.ts tenant-isolation.e2e-spec.ts
```

Expected: manager viewer lifecycle actions pass; protected-role actions return
`403`; tenant and last-owner tests remain green.

### Task 2: Invitation role validation and dashboard role-aware controls

**Files:**
- Modify: `apps/api/src/invitations/invitations.service.ts`
- Modify: `apps/api/test/invitations.e2e-spec.ts`
- Modify: `apps/web-dashboard/app/settings/users/users-panel.tsx`
- Modify: `apps/web-dashboard/tests/users.spec.ts`

- [ ] **Step 1: Write failing reserved-role and dashboard tests**

Add an API request from an owner with `role: "tenant"` and expect `400`.
Add dashboard tests that mock a manager session and assert the Invite role
select has only `viewer`; mock a viewer session and assert the invitation form
is not rendered.

- [ ] **Step 2: Run tests to verify they fail**

```bash
corepack pnpm --filter @iot-management/api test:e2e -- invitations.e2e-spec.ts
corepack pnpm --filter @iot-management/web-dashboard test:e2e -- users.spec.ts
```

Expected: tenant invitation is accepted and dashboard exposes all roles before
the change.

- [ ] **Step 3: Implement matching API and UI restrictions**

Validate invitation roles against the same managed role set. In `UsersPanel`,
use `useCurrentSession()` and derive:

```ts
const inviteRoles =
  session.data?.membership.role === "owner"
    ? (["viewer", "manager", "owner"] as const)
    : (["viewer"] as const);
const canManageUsers =
  session.data?.membership.role === "owner" ||
  session.data?.membership.role === "manager";
```

Render an access-restricted state for viewers and render the invitation form
only when `canManageUsers` is true.

- [ ] **Step 4: Run focused tests and verify they pass**

```bash
corepack pnpm --filter @iot-management/api test:e2e -- invitations.e2e-spec.ts
corepack pnpm --filter @iot-management/web-dashboard test:e2e -- users.spec.ts
```

Expected: API rejects tenant role and dashboard offers only permitted choices.

### Task 3: Full regression and manual verification

**Files:**
- No production files beyond Tasks 1 and 2.

- [ ] **Step 1: Run regressions**

```bash
corepack pnpm --filter @iot-management/api test
corepack pnpm --filter @iot-management/api build
corepack pnpm --filter @iot-management/web-dashboard lint
corepack pnpm --filter @iot-management/web-dashboard typecheck
corepack pnpm --filter @iot-management/web-dashboard test
corepack pnpm --filter @iot-management/web-dashboard build
```

- [ ] **Step 2: Manually verify roles**

1. Sign in as `owner@north.example`: invite viewer, manager, or owner options
   are available.
2. Sign in as `manager@north.example`: only viewer is available; direct API
   requests against owner/manager memberships return `403`.
3. Sign in as `viewer@north.example`: the Users page shows an access-restricted
   state and server mutations return `403`.
4. Attempt to remove the final active owner: API returns `LAST_OWNER_REQUIRED`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/tenants/memberships.service.ts apps/api/src/invitations/invitations.service.ts apps/api/test/invitations.e2e-spec.ts apps/web-dashboard/app/settings/users/users-panel.tsx apps/web-dashboard/tests/users.spec.ts
git commit -m "fix: harden membership privilege controls"
```
