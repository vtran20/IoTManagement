import { describe, expect, it } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { LeakAnalyticsService } from "./leak-analytics.service";

describe("LeakAnalyticsService", () => {
  it("calculates tenant-scoped response time, recurrence, excess water, and outcomes", async () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      organizationId: "org_north",
      name: "Analytics Tower",
      timezone: "America/Detroit",
    });
    const unit = persistence.createUnit({
      organizationId: "org_north",
      buildingId: building.id,
      name: "101",
      occupancyStatus: "occupied",
    });
    const first = persistence.createLeakIncident({
      buildingId: building.id,
      description: "First water issue",
      detectedAt: "2026-06-01T00:00:00.000Z",
      estimatedExcessCost: 2.5,
      estimatedExcessWater: 12.5,
      organizationId: "org_north",
      severity: "warning",
      source: "meter_anomaly",
      title: "First incident",
      unitId: unit.id,
    });
    persistence.updateLeakIncident("org_north", first.id, {
      acknowledgedAt: "2026-06-01T00:10:00.000Z",
      containedAt: "2026-06-01T00:40:00.000Z",
      resolvedAt: "2026-06-01T01:00:00.000Z",
      resolutionCategory: "leak_fixed",
      resolutionNote: "Repaired",
      status: "resolved",
    });
    persistence.createLeakIncident({
      buildingId: building.id,
      description: "Second water issue",
      detectedAt: "2026-06-02T00:00:00.000Z",
      estimatedExcessCost: 1.25,
      estimatedExcessWater: 7.5,
      organizationId: "org_north",
      severity: "warning",
      source: "manual_report",
      title: "Second incident",
      unitId: unit.id,
    });
    persistence.createLeakIncident({
      buildingId: "building_south",
      description: "Other tenant issue",
      detectedAt: "2026-06-01T00:00:00.000Z",
      estimatedExcessCost: 99,
      estimatedExcessWater: 99,
      organizationId: "org_south",
      severity: "critical",
      source: "meter_anomaly",
      title: "South incident",
    });

    const report = await new LeakAnalyticsService(persistence).summary(
      "org_north",
      {
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-06-30T23:59:59.999Z",
      },
    );

    expect(report.incidentCount).toBe(2);
    expect(report.responseTime.acknowledged).toEqual({
      averageMinutes: 10,
      count: 1,
      medianMinutes: 10,
    });
    expect(report.responseTime.contained).toEqual({
      averageMinutes: 40,
      count: 1,
      medianMinutes: 40,
    });
    expect(report.responseTime.resolved).toEqual({
      averageMinutes: 60,
      count: 1,
      medianMinutes: 60,
    });
    expect(report.excessWater).toEqual({
      estimatedCost: 3.75,
      gallons: 20,
    });
    expect(report.recurringLocations).toEqual([
      expect.objectContaining({
        buildingId: building.id,
        buildingName: "Analytics Tower",
        incidentCount: 2,
        unitId: unit.id,
        unitName: "101",
      }),
    ]);
    expect(report.resolutionOutcomes).toMatchObject({
      leak_fixed: 1,
      false_positive: 0,
    });
  });
});
