import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "features/dashboard/dashboard-overview.tsx"),
  "utf8",
);
const styles = readFileSync(resolve(process.cwd(), "app/styles.css"), "utf8");

describe("DashboardOverview operations hierarchy", () => {
  it("renders operations before utility analytics", () => {
    const summary = source.indexOf("<OperationsSummary");
    const queue = source.indexOf("<OperationsToday");
    const analytics = source.indexOf("<OverviewCards");

    expect(summary).toBeGreaterThan(-1);
    expect(queue).toBeGreaterThan(summary);
    expect(analytics).toBeGreaterThan(queue);
  });

  it("defines stable desktop, tablet, and mobile operations layouts", () => {
    expect(styles).toContain(
      ".operations-metric-strip {\n  display: grid;\n  grid-column: 1 / -1;\n  grid-template-columns: repeat(4, minmax(0, 1fr));",
    );
    expect(styles).toContain(
      ".operations-queue {\n  grid-column: 1 / -1;\n  min-width: 0;",
    );
    expect(styles).toContain(
      ".operations-metric-strip {\n    grid-template-columns: repeat(2, minmax(0, 1fr));",
    );
    expect(styles).toContain(
      ".operations-metric-strip {\n    grid-template-columns: 1fr;",
    );
  });
});
