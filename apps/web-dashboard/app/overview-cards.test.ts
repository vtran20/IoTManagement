import type {
  DashboardOverviewRange,
  DashboardSummaryResponse,
} from "@iot-management/types";
import { describe, expect, it } from "vitest";
import { usageSummaryCards } from "../features/dashboard/overview-cards";

describe("usageSummaryCards", () => {
  it("shows real period context when no API comparison exists", () => {
    const cards = usageSummaryCards(
      {
        criticalAlertCount: 0,
        generatedAt: "2026-07-05T12:00:00.000Z",
        offlineMeterCount: 0,
        openAlertCount: 0,
        organizationId: "org_north",
        staleMeterCount: 0,
        utilitySummaries: [
          { costEstimate: 250, usageValue: 50000, utilityType: "water" },
          { costEstimate: 90, usageValue: 750, utilityType: "electric" },
        ],
      } satisfies DashboardSummaryResponse,
      {
        from: "2026-06-01T00:00:00.000Z",
        periodType: "day",
        to: "2026-07-01T00:00:00.000Z",
      } satisfies DashboardOverviewRange,
    );

    expect(cards).toEqual([
      expect.objectContaining({
        label: "Water Usage",
        support: "Last 30 days",
        value: "50,000 gal",
      }),
      expect.objectContaining({
        label: "Electric Usage",
        support: "Last 30 days",
        value: "750 kWh",
      }),
    ]);
  });
});
