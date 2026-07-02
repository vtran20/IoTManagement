import { describe, expect, it } from "vitest";
import { trendAxisPeriods } from "../features/dashboard/usage-trend-chart";

describe("trendAxisPeriods", () => {
  it("deduplicates periods before rendering chart labels", () => {
    expect(
      trendAxisPeriods([
        {
          periodEnd: "2026-04-02T13:00:00.000Z",
          periodStart: "2026-04-02T12:00:00.000Z",
          usageValue: 10,
          utilityType: "electric",
        },
        {
          periodEnd: "2026-04-02T13:00:00.000Z",
          periodStart: "2026-04-02T12:00:00.000Z",
          usageValue: 12,
          utilityType: "electric",
        },
        {
          periodEnd: "2026-04-03T13:00:00.000Z",
          periodStart: "2026-04-03T12:00:00.000Z",
          usageValue: 8,
          utilityType: "water",
        },
      ]),
    ).toEqual(["2026-04-02T12:00:00.000Z", "2026-04-03T12:00:00.000Z"]);
  });
});
