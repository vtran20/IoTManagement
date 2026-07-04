import { describe, expect, it } from "vitest";
import { LeakAnalyticsService } from "../incidents/leak-analytics.service";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { LeakReportsService } from "./leak-reports.service";

describe("LeakReportsService", () => {
  it("creates structured JSON, CSV, and PDF leak-response reports", async () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      organizationId: "org_north",
      name: "Report Tower",
      timezone: "America/Detroit",
    });
    const incident = persistence.createLeakIncident({
      buildingId: building.id,
      description: "Reportable incident",
      detectedAt: "2026-06-01T00:00:00.000Z",
      estimatedExcessCost: 3.5,
      estimatedExcessWater: 20,
      organizationId: "org_north",
      severity: "warning",
      source: "meter_anomaly",
      title: "Report incident",
    });
    persistence.updateLeakIncident("org_north", incident.id, {
      acknowledgedAt: "2026-06-01T00:15:00.000Z",
      resolvedAt: "2026-06-01T01:00:00.000Z",
      resolutionCategory: "leak_fixed",
      resolutionNote: "Repaired",
      status: "resolved",
    });
    const service = new LeakReportsService(
      persistence,
      new LeakAnalyticsService(persistence),
    );
    const query = {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-30T23:59:59.999Z",
    };

    await expect(service.json("org_north", query)).resolves.toMatchObject({
      format: "json",
      reportType: "leak_response",
      incidentCount: 1,
    });
    await expect(service.csv("org_north", query)).resolves.toContain(
      "Acknowledgement median (minutes)",
    );
    const pdf = await service.pdf("org_north", query);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
