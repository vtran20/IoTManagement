# Dashboard UI Reference Knowledge

Date: 2026-07-02
Status: Approved working guide

## Purpose

This document translates the shadcnblocks admin dashboard reference into practical UI rules for the IoT Management web dashboard. Use it when designing or reviewing dashboard shell, navigation, cards, charts, iconography, responsive behavior, and visual QA.

Primary reference:

- shadcnblocks Admin Kit ecommerce dashboard: https://shadcnblocks-admin.vercel.app/ecommerce/dashboard-1

Supporting shadcn/ui references:

- Sidebar: https://ui.shadcn.com/docs/components/sidebar
- Sheet: https://ui.shadcn.com/docs/components/sheet
- Charts: https://ui.shadcn.com/charts

## Product Fit

The IoT Management dashboard is an operational SaaS interface for apartment and building owners. It should feel calm, dense, and repeatable, not like a marketing page. The first screen after login must be useful for daily operations: utility usage, cost, anomalies, alerts, device health, building comparisons, and unit rankings.

Use the shadcnblocks reference for layout rhythm and restraint, then adapt labels and data to smart utilities. Ecommerce concepts such as revenue, orders, and customers should become utility concepts such as cost, usage, alerts, meters, buildings, and units.

## Visual Direction

Follow these baseline qualities from the reference:

- A calm left sidebar with clear grouping, compact rows, and predictable navigation.
- A slim top bar for page title and commands.
- Rounded metric cards with small labels, strong values, and restrained change indicators.
- Bordered chart panels with compact headers.
- Monochrome-first styling with muted gray hierarchy and minimal accent color.
- Dense spacing that remains readable for repeated property-management work.

Avoid:

- Landing-page composition.
- Oversized hero sections.
- Decorative gradients, orbs, or illustration-heavy panels.
- Sparse cards that make operational scanning slow.
- Purely decorative icons that do not clarify the task.

## Layout System

The dashboard shell should use a persistent app layout:

- Desktop: left sidebar, top bar, content area.
- Tablet: collapsed rail or offcanvas sidebar with a visible trigger.
- Mobile: sheet/offcanvas navigation with a visible menu trigger.

Do not hide navigation without replacement. If the desktop sidebar is removed at a breakpoint, a mobile navigation trigger must appear in the top bar and open the same navigation items.

Recommended shadcn primitives:

- Use `SidebarProvider`, `Sidebar`, `SidebarInset`, and `SidebarTrigger` for the main shell when adopting the shadcn/sidebar pattern.
- Use `Sheet`, `SheetTrigger`, and `SheetContent side="left"` when a lighter mobile drawer is enough.
- Keep the navigation source of truth shared between desktop sidebar and mobile sheet.

## Responsive Rules

Every dashboard surface must be checked at these widths:

- 1440px desktop.
- 1024px tablet.
- 768px narrow tablet.
- 390px mobile.

Required behavior:

- Navigation remains reachable at all widths.
- Top-bar actions wrap or collapse into icon buttons before they overflow.
- Cards stack into one column on mobile.
- Tables use horizontal scroll or mobile-specific rows.
- Chart labels never overlay marks, bars, legends, or neighboring text.
- Text inside cards, buttons, and chart rows fits inside its parent.

Avoid fixed label columns that are too narrow for real data. Building and unit names are customer data, so they will be longer than demos. Reserve enough width, allow wrapping where appropriate, or use truncation with a title/tooltip.

## Card Rules

Metric cards:

- Use concise labels.
- Keep the value prominent but not hero-sized.
- Put secondary context below the value.
- Keep icons small and quiet.

Chart cards:

- Use a compact header with icon, title, and optional legend/action.
- Give the chart body stable dimensions.
- Keep chart controls in the header, not floating over data.
- Use empty, loading, error, and stale-data states.

Do not nest cards inside cards. Page sections should be unframed layout bands or grids; cards should represent individual repeated items or actual framed data panels.

## Iconography Rules

Use lucide icons as real SVG icons. Do not draw fake icons with CSS pseudo-elements unless there is a strong reason and the result has been visually tested.

Rules:

- Standard inline icon size: 16px.
- Navigation icon touch target: 32px to 36px, with the icon itself 16px to 18px.
- Icon-only buttons need accessible labels.
- Decorative icons use `aria-hidden="true"`.
- Interactive icon buttons need visible focus states.
- Do not apply a heavy border directly to the SVG path or create a pseudo-icon with `border: 2px solid #71717a`.

Current issue to avoid:

- A bordered square container can be appropriate for an icon button or card leading icon.
- A second CSS pseudo-element border inside that square makes the icon look broken and visually heavier than the reference.
- Prefer lucide icons such as `PanelLeft`, `ChartNoAxesCombined`, `Gauge`, `Droplets`, `Zap`, `Building2`, `Bell`, `FileText`, and `Settings`.

## Chart Rules

Use Recharts or shadcn chart patterns for production charts when possible. Custom SVG is acceptable for static demos, but production chart components should scale, label, and handle empty data predictably.

General chart requirements:

- The chart answers an operational question.
- Axis and legend labels are readable at mobile widths.
- Data marks do not cover labels.
- Empty data has an explicit state.
- Loading uses skeletons or stable placeholders.
- Error state explains what failed and how to retry or refresh.
- Stale data state shows last updated time when available.

For horizontal bar comparisons:

- Use a grid with a label column that can fit realistic building names.
- Prefer `grid-template-columns: minmax(96px, 32%) minmax(0, 1fr)` or a stacked mobile layout.
- Use `min-width: 0` on text and chart containers.
- Use `overflow: hidden; text-overflow: ellipsis;` only when the full value is available through title text or tooltip.
- Keep bar stacks independent from labels so bars cannot slide under text.

For trend charts:

- Use responsive containers.
- Reserve bottom space for axis labels.
- Avoid hard-coded paths that ignore actual data.
- Preserve chart height across loading, error, empty, and loaded states.

## Current Dashboard Pitfalls To Fix

These issues were observed in the current implementation and screenshots:

### Sidebar Disappears

Current pattern:

```css
@media (max-width: 1100px) {
  .sidebar {
    display: none;
  }
}
```

Problem: navigation is removed at smaller widths. The shadcn reference and shadcn Sidebar pattern keep navigation available through a trigger, collapsed rail, or mobile offcanvas panel.

Required correction: add a mobile/tablet navigation trigger and render the same nav items in a sheet or shadcn mobile sidebar.

### Text Overlays Bar Charts

Current pattern:

```css
.bar-row {
  grid-template-columns: 36px 1fr;
}
```

Problem: real building names cannot fit in 36px, so labels overlap chart bars.

Required correction: reserve a realistic label area, allow labels to wrap above bars on mobile, or use truncation with accessible full text.

### Icon Border Looks Broken

Current pattern:

```css
.metric-icon::after,
.chart-icon::after {
  border: 2px solid #71717a;
  border-top: 0;
}
```

Problem: the pseudo-element draws a second heavy border that does not match lucide icon language or the shadcnblocks reference.

Required correction: render a real lucide icon inside the icon container, and remove pseudo-element icon drawing.

## Implementation Guidance

When updating dashboard UI:

1. Start from shadcn/ui primitives when they fit: Sidebar, Sheet, Button, Card, Table, Skeleton, Badge, Tooltip, Dropdown Menu, and Chart patterns.
2. Keep shared navigation data in one module and render it in both desktop and mobile navigation.
3. Use semantic HTML first: `nav`, `main`, `header`, `section`, `article`, `table`, and labelled controls.
4. Prefer Tailwind/shadcn tokens if the project moves to componentized shadcn styles; if using plain CSS, keep token-like variables for colors, borders, radius, spacing, and foreground-muted values.
5. Use lucide icons through a typed mapping so labels have consistent icon choices.
6. Add component tests for data transformation logic and visual-state tests for loading, empty, error, and stale states.
7. Add Playwright checks for desktop and mobile dashboard layout before calling UI work complete.

## Manual Visual QA Checklist

Run the dashboard locally and inspect:

```bash
pnpm --filter @iot-management/web-dashboard dev
```

Then check:

- Desktop at 1440px: sidebar visible, top bar aligned, cards evenly spaced.
- Tablet at 1024px: navigation still reachable; content does not overflow.
- Mobile at 390px: menu trigger visible; sheet/drawer opens; cards stack cleanly.
- Usage by Building: long building names do not overlap bars.
- Total Utility Usage: icon renders as a clean lucide icon, not a heavy bordered pseudo-icon.
- All chart panels: legends wrap cleanly and do not collide with titles.
- Tables: no page-wide horizontal overflow except inside intended table scroll containers.
- Keyboard: tab order reaches sidebar trigger, nav links, top-bar controls, and card actions.

## Acceptance Criteria For Future UI Changes

A dashboard UI change is ready only when:

- It follows the shadcnblocks admin direction without copying ecommerce content.
- It preserves navigation access at every supported viewport.
- It uses real lucide/shadcn iconography, not CSS-drawn pseudo-icons.
- It prevents label, chart, and legend overlap with realistic customer data.
- It includes loading, empty, error, and stale-data states where data is fetched.
- It has focused tests for changed data/UI behavior.
- It has manual verification notes with exact viewport sizes and expected results.

