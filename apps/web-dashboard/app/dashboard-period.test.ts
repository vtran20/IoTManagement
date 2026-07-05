import { describe, expect, it } from "vitest";
import { formatDashboardRangeLabel } from "../features/dashboard/dashboard-period";

describe("formatDashboardRangeLabel", () => {
  it("uses the actual overview range instead of a generic current-period label", () => {
    expect(
      formatDashboardRangeLabel({
        from: "2026-06-01T00:00:00.000Z",
        periodType: "day",
        to: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe("Last 30 days");
  });
});
