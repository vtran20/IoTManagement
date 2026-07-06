import { describe, expect, it } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { ReportsService } from "./reports.service";

describe("ReportsService", () => {
  it("groups monthly water and electric usage into one unit report row", async () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      name: "Report Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const unit = persistence.createUnit({
      buildingId: building.id,
      name: "101",
      occupancyStatus: "occupied",
      organizationId: "org_north",
    });
    for (const [meterId, utilityType, usageValue, costEstimate] of [
      ["water-report", "water", 120, 0.6],
      ["electric-report", "electric", 45, 6.75],
    ] as const) {
      persistence.createUsageAggregate({
        buildingId: building.id,
        costEstimate,
        meterId,
        organizationId: "org_north",
        periodEnd: "2026-07-01T00:00:00.000Z",
        periodStart: "2026-06-01T00:00:00.000Z",
        periodType: "month",
        unitId: unit.id,
        usageValue,
        utilityType,
      });
    }
    const service = new ReportsService(persistence);

    const report = await service.monthlyUsage("org_north", {
      month: "2026-06",
    });
    const csv = await service.monthlyUsageCsv("org_north", {
      month: "2026-06",
    });

    expect(report.rows).toEqual([
      expect.objectContaining({
        electricKwh: 45,
        estimatedCost: 7.35,
        unitName: "101",
        waterGallons: 120,
      }),
    ]);
    expect(csv).toContain("Report Tower,101,120,45,7.35");
  });
});
