# Navigation Selection And Report Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Highlight the current operational area in the desktop/mobile navigation and restore the Leak Response Report to the full dashboard width.

**Architecture:** Keep route matching in the shared `Nav` component so the desktop sidebar and mobile drawer cannot drift. Keep report layout ownership in the report component and stylesheet: its root spans the existing 12-column workspace, while its internal layout remains responsive.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Playwright, CSS Grid.

---

### Task 1: Route-aware navigation selection

**Files:**
- Modify: `apps/web-dashboard/components/nav.tsx`
- Create: `apps/web-dashboard/components/nav.test.ts`

- [ ] **Step 1: Write the failing route-matching tests**

```tsx
import { describe, expect, it } from "vitest";
import { isNavigationItemActive } from "./nav";

describe("isNavigationItemActive", () => {
  it("matches an exact section route", () => {
    expect(isNavigationItemActive("/incidents", "/incidents")).toBe(true);
    expect(isNavigationItemActive("/incidents", "/buildings")).toBe(false);
  });

  it("matches nested routes only within the same section", () => {
    expect(
      isNavigationItemActive("/buildings/building_north_ridge", "/buildings"),
    ).toBe(true);
    expect(
      isNavigationItemActive("/incidents/incident_123", "/incidents"),
    ).toBe(true);
    expect(
      isNavigationItemActive("/incidents/incident_123", "/buildings"),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- components/nav.test.ts
```

Expected: FAIL because `isNavigationItemActive` is not exported.

- [ ] **Step 3: Implement pathname matching and active link semantics**

```tsx
"use client";

import { usePathname } from "next/navigation";

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// In Nav(), derive `active` for each item and apply:
// className={`nav-item${active ? " active" : ""}`}
// aria-current={active ? "page" : undefined}
```

Keep the existing `navItems`, icons, links, and chevrons unchanged.

- [ ] **Step 4: Run focused tests to verify they pass**

Run:

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- components/nav.test.ts
```

Expected: PASS with exact and nested-route coverage.

- [ ] **Step 5: Commit the navigation change**

```bash
git add apps/web-dashboard/components/nav.tsx apps/web-dashboard/components/nav.test.ts
git commit -m "fix: highlight active dashboard navigation"
```

### Task 2: Full-width Leak Response Report

**Files:**
- Modify: `apps/web-dashboard/features/reports/leak-response-report.tsx`
- Modify: `apps/web-dashboard/app/styles.css`
- Create: `apps/web-dashboard/features/reports/leak-response-report.test.ts`

- [ ] **Step 1: Write the failing report-root test**

```tsx
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "features/reports/leak-response-report.tsx"),
  "utf8",
);
const styles = readFileSync(resolve(process.cwd(), "app/styles.css"), "utf8");

describe("LeakResponseReport layout", () => {
  it("declares its full-width workspace root class", () => {
    expect(source).toContain('className="leak-response-report"');
    expect(styles).toContain(
      ".leak-response-report {\n  grid-column: 1 / -1;",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- features/reports/leak-response-report.test.ts
```

Expected: FAIL because the component root has no full-width class.

- [ ] **Step 3: Apply the component-local full-width layout contract**

```tsx
<section
  aria-labelledby="leak-response-report-heading"
  className="leak-response-report"
>
```

```css
.leak-response-report {
  grid-column: 1 / -1;
  min-width: 0;
}
```

Do not alter the existing `.report-grid` desktop two-column rule or mobile
single-column breakpoint.

- [ ] **Step 4: Run focused tests to verify they pass**

Run:

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- features/reports/leak-response-report.test.ts
```

Expected: PASS with the root layout class present.

- [ ] **Step 5: Commit the report-layout change**

```bash
git add apps/web-dashboard/features/reports/leak-response-report.tsx apps/web-dashboard/features/reports/leak-response-report.test.ts apps/web-dashboard/app/styles.css
git commit -m "fix: restore leak report dashboard layout"
```

### Task 3: Regression and visual verification

**Files:**
- Modify: `apps/web-dashboard/tests/dashboard.spec.ts`

- [ ] **Step 1: Add a browser assertion for current-section navigation**

```tsx
await page.goto("/incidents");
await expect(page.getByRole("link", { name: "Incidents" })).toHaveAttribute(
  "aria-current",
  "page",
);
await expect(page.getByRole("link", { name: "Buildings" })).not.toHaveAttribute(
  "aria-current",
  "page",
);
```

- [ ] **Step 2: Add a report layout browser assertion**

```tsx
await page.goto("/reports");
await expect(page.locator(".leak-response-report")).toBeVisible();
await expect(page.locator(".report-grid")).toBeVisible();
```

- [ ] **Step 3: Run dashboard verification**

Run:

```bash
corepack pnpm --filter @iot-management/web-dashboard lint
corepack pnpm --filter @iot-management/web-dashboard typecheck
corepack pnpm --filter @iot-management/web-dashboard test
corepack pnpm --filter @iot-management/web-dashboard build
corepack pnpm --filter @iot-management/web-dashboard test:e2e
```

Expected: lint/typecheck/build exit 0; unit and browser tests pass. If
`test:e2e` cannot start because a user-run Next development server owns the
`.next` lock, preserve that server and record the lock as the reason the suite
was not run.

- [ ] **Step 4: Manually verify the dashboard**

1. Sign in and open `http://localhost:3000/buildings`; Buildings has the
   selected background.
2. Open a building detail route; Buildings remains selected.
3. Open `http://localhost:3000/incidents`; Incidents, not Buildings, is
   selected.
4. Open `http://localhost:3000/reports` at desktop width; Leak Response Report
   spans the workspace and shows its two panels side by side.
5. Resize below 1100px; the report panels stack without clipped or overlapping
   content.

- [ ] **Step 5: Commit the regression tests**

```bash
git add apps/web-dashboard/tests/dashboard.spec.ts
git commit -m "test: cover dashboard navigation and report layout"
```
