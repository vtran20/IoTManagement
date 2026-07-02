# Dashboard UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the reported dashboard UI issues and scan the web dashboard for similar responsive, chart-label, and iconography problems.

**Architecture:** Keep the current plain CSS and React component structure, while aligning behavior with the approved dashboard UI reference guide. Use one shared navigation data source, a CSS-only mobile navigation drawer, real lucide icons, and safer grid rules for chart labels.

**Tech Stack:** Next.js, React, TypeScript, plain CSS, lucide-react, Vitest, Playwright.

---

## Chunk 1: Responsive Navigation And Icon Tests

### Task 1: Add failing responsive shell coverage

**Files:**
- Modify: `apps/web-dashboard/tests/dashboard.spec.ts`
- Modify: `apps/web-dashboard/components/nav.tsx`
- Modify: `apps/web-dashboard/components/app-shell.tsx`
- Modify: `apps/web-dashboard/app/styles.css`

- [ ] **Step 1: Write failing Playwright tests**

Add tests that verify:

- At mobile width, a `Menu` button is visible.
- The desktop sidebar is not visible at mobile width.
- Activating the menu reveals the same navigation links.
- At desktop width, the sidebar remains visible and the mobile menu trigger is hidden.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @iot-management/web-dashboard test:e2e -- tests/dashboard.spec.ts`

Expected: FAIL because no mobile menu trigger exists.

- [ ] **Step 3: Implement minimal responsive navigation**

Expose shared `navItems` from `components/nav.tsx`. Render desktop sidebar plus a mobile nav checkbox/label trigger in `AppShell`. Use CSS to show a sheet-like navigation panel below 1100px and preserve desktop sidebar above 1100px.

- [ ] **Step 4: Run focused e2e test and verify it passes**

Run: `pnpm --filter @iot-management/web-dashboard test:e2e -- tests/dashboard.spec.ts`

Expected: PASS.

## Chunk 2: Chart Label And Icon Cleanup

### Task 2: Add failing chart/icon CSS coverage

**Files:**
- Modify: `apps/web-dashboard/app/iconography.test.ts`
- Modify: `apps/web-dashboard/app/styles.css`
- Modify: `apps/web-dashboard/features/dashboard/building-breakdown-chart.tsx`
- Modify: `apps/web-dashboard/features/dashboard/usage-trend-chart.tsx`

- [ ] **Step 1: Write failing unit tests**

Add tests that read `app/styles.css` and verify:

- `.metric-icon::after` and `.chart-icon::after` are not used.
- `.bar-row` reserves realistic label width using `minmax(...)` instead of `36px`.
- Mobile CSS stacks `.bar-row` to avoid label/bar collision.

- [ ] **Step 2: Run the focused unit tests and verify failure**

Run: `pnpm --filter @iot-management/web-dashboard test -- app/iconography.test.ts app/usage-trend-chart.test.ts`

Expected: FAIL because pseudo-icon CSS and narrow bar labels still exist.

- [ ] **Step 3: Implement chart and icon fixes**

Render real lucide icons in chart headers. Remove pseudo-element icon drawing. Update `.bar-row` and mobile chart CSS to prevent label overlap. Add title text for long building labels.

- [ ] **Step 4: Run focused unit tests and verify pass**

Run: `pnpm --filter @iot-management/web-dashboard test -- app/iconography.test.ts app/usage-trend-chart.test.ts`

Expected: PASS.

## Chunk 3: Full Web Scan And Verification

### Task 3: Scan the dashboard for repeated UI anti-patterns

**Files:**
- Inspect: `apps/web-dashboard/**/*.tsx`
- Inspect: `apps/web-dashboard/app/styles.css`

- [ ] **Step 1: Search for risky patterns**

Run:

```bash
rg -n "display: none|::after|grid-template-columns: [0-9]+px|chart-icon|metric-icon|overflow|position: absolute" apps/web-dashboard
```

- [ ] **Step 2: Fix only related UI issues**

Fix same-class issues only: hidden navigation without trigger, pseudo-icon borders, too-narrow label columns, and obvious text overflow risks. Do not redesign unrelated pages.

- [ ] **Step 3: Run verification**

Run:

```bash
pnpm --filter @iot-management/web-dashboard test
pnpm --filter @iot-management/web-dashboard typecheck
pnpm --filter @iot-management/web-dashboard lint
```

If browser dependencies are available, also run:

```bash
pnpm --filter @iot-management/web-dashboard test:e2e -- tests/dashboard.spec.ts
```

- [ ] **Step 4: Manual verification notes**

Document what was verified and any checks that could not run because browser dependencies or services were unavailable.
