# Operational Detail Breadcrumbs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accessible, context-preserving breadcrumbs to the current building, unit, meter, and incident detail pages.

**Architecture:** A shared presentational `Breadcrumbs` component owns semantic navigation and wrapping styles. Each detail view keeps ownership of its own API-backed labels and passes an ordered breadcrumb array; no API endpoints or domain models change.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, CSS.

---

### Task 1: Shared accessible breadcrumb component

**Files:**
- Create: `apps/web-dashboard/components/breadcrumbs.tsx`
- Create: `apps/web-dashboard/app/breadcrumbs.test.tsx`
- Modify: `apps/web-dashboard/app/styles.css`

- [ ] **Step 1: Write the failing markup test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "../components/breadcrumbs";

describe("Breadcrumbs", () => {
  it("links ancestors and identifies the current page", () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs
        items={[
          { href: "/buildings", label: "Buildings" },
          { href: "/buildings/building_north", label: "North Ridge" },
          { label: "Unit 1201" },
        ]}
      />,
    );

    expect(html).toContain('href="/buildings"');
    expect(html).toContain('href="/buildings/building_north"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Unit 1201");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- app/breadcrumbs.test.tsx
```

Expected: FAIL because the shared breadcrumb component does not exist.

- [ ] **Step 3: Implement the component and its styles**

```tsx
export type BreadcrumbItem = { href?: string; label: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.href ?? "current"}:${item.label}`}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {current || !item.href ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <a href={item.href}>{item.label}</a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

```css
.breadcrumbs ol {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
}

.breadcrumbs li {
  align-items: center;
  display: inline-flex;
  gap: 6px;
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- app/breadcrumbs.test.tsx
```

Expected: PASS with ancestor links and one current-page item.

### Task 2: Building and unit property hierarchy

**Files:**
- Modify: `apps/web-dashboard/app/buildings/[buildingId]/building-detail.tsx`
- Modify: `apps/web-dashboard/app/units/[unitId]/unit-detail.tsx`
- Create: `apps/web-dashboard/app/operational-breadcrumbs.test.ts`

- [ ] **Step 1: Write the failing detail-screen contract test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const buildingDetail = readFileSync(
  resolve(process.cwd(), "app/buildings/[buildingId]/building-detail.tsx"),
  "utf8",
);
const unitDetail = readFileSync(
  resolve(process.cwd(), "app/units/[unitId]/unit-detail.tsx"),
  "utf8",
);

describe("property detail breadcrumbs", () => {
  it("uses the shared breadcrumb component", () => {
    expect(buildingDetail).toContain("Breadcrumbs");
    expect(unitDetail).toContain("Breadcrumbs");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- app/operational-breadcrumbs.test.ts
```

Expected: FAIL because neither detail screen imports `Breadcrumbs`.

- [ ] **Step 3: Add property hierarchy breadcrumbs**

```tsx
<Breadcrumbs
  items={[
    { href: "/buildings", label: "Buildings" },
    { label: building.name },
  ]}
/>
```

```tsx
<Breadcrumbs
  items={[
    { href: "/buildings", label: "Buildings" },
    {
      href: `/buildings/${unit.data.buildingId}`,
      label: buildingName,
    },
    { label: unit.data.name },
  ]}
/>
```

Place each breadcrumb directly above the existing detail heading.

- [ ] **Step 4: Run the focused test to verify it passes**

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- app/operational-breadcrumbs.test.ts
```

Expected: PASS.

### Task 3: Meter and incident operational breadcrumbs

**Files:**
- Modify: `apps/web-dashboard/app/meters/[meterId]/meter-detail.tsx`
- Modify: `apps/web-dashboard/features/incidents/incident-detail.tsx`
- Modify: `apps/web-dashboard/app/operational-breadcrumbs.test.ts`

- [ ] **Step 1: Extend the failing contract test**

```ts
const meterDetail = readFileSync(
  resolve(process.cwd(), "app/meters/[meterId]/meter-detail.tsx"),
  "utf8",
);
const incidentDetail = readFileSync(
  resolve(process.cwd(), "features/incidents/incident-detail.tsx"),
  "utf8",
);

expect(meterDetail).toContain("Breadcrumbs");
expect(incidentDetail).toContain("Breadcrumbs");
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- app/operational-breadcrumbs.test.ts
```

Expected: FAIL because meter and incident details do not yet use `Breadcrumbs`.

- [ ] **Step 3: Add operational-area breadcrumbs**

```tsx
<Breadcrumbs
  items={[
    { href: "/meters", label: "Meters" },
    { label: name },
  ]}
/>
```

```tsx
<Breadcrumbs
  items={[
    { href: "/incidents", label: "Incidents" },
    { label: data.title },
  ]}
/>
```

Replace the incident screen's existing standalone `Water incidents` back link
with the incident breadcrumb.

- [ ] **Step 4: Run the focused test to verify it passes**

```bash
corepack pnpm --filter @iot-management/web-dashboard test -- app/operational-breadcrumbs.test.ts
```

Expected: PASS.

### Task 4: Full dashboard regression verification

**Files:**
- Modify: `apps/web-dashboard/tests/portfolio-management.spec.ts`
- Modify: `apps/web-dashboard/tests/water-operations.spec.ts`

- [ ] **Step 1: Add browser expectations**

```tsx
await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
await expect(page.getByRole("link", { name: "Buildings" })).toBeVisible();
await expect(page.getByText("North Ridge Mixed Use Building With A Very Long Operational Name")).toBeVisible();
```

For the incident screen, assert the `Incidents` breadcrumb link and its current
incident title are visible.

- [ ] **Step 2: Run verification**

```bash
corepack pnpm --filter @iot-management/web-dashboard lint
corepack pnpm --filter @iot-management/web-dashboard typecheck
corepack pnpm --filter @iot-management/web-dashboard test
corepack pnpm --filter @iot-management/web-dashboard build
corepack pnpm --filter @iot-management/web-dashboard test:e2e
```

Expected: lint, typecheck, unit tests, build, and browser tests pass. If a
user-run Next development server holds the `.next` lock, do not stop it; report
the browser-suite startup limitation and provide manual verification.

- [ ] **Step 3: Manually verify**

1. Open a building detail page: `Buildings / <Building>` is shown.
2. Open a unit detail page: `Buildings / <Building> / <Unit>` is shown and the
   building segment links to its detail page.
3. Open a meter detail page: `Meters / <Meter>` is shown.
4. Open an incident detail page: `Incidents / <Incident>` is shown.
5. At mobile width, confirm long labels wrap without horizontal overflow.

- [ ] **Step 4: Commit the implementation**

```bash
git add apps/web-dashboard/components/breadcrumbs.tsx apps/web-dashboard/app/styles.css apps/web-dashboard/app/breadcrumbs.test.tsx apps/web-dashboard/app/operational-breadcrumbs.test.ts apps/web-dashboard/app/buildings/[buildingId]/building-detail.tsx apps/web-dashboard/app/units/[unitId]/unit-detail.tsx apps/web-dashboard/app/meters/[meterId]/meter-detail.tsx apps/web-dashboard/features/incidents/incident-detail.tsx apps/web-dashboard/tests/portfolio-management.spec.ts apps/web-dashboard/tests/water-operations.spec.ts
git commit -m "feat: add operational detail breadcrumbs"
```
