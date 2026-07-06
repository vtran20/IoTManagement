import { describe, expect, it } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { MeterHealthService } from "./meter-health.service";

describe("MeterHealthService", () => {
  it("marks an accepted reading as the meter's latest online reading", async () => {
    const persistence = new InMemoryPersistenceService();
    const meter = persistence.createMeter({
      buildingId: "building_north_test",
      externalId: "meter-health-water",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    const service = new MeterHealthService(persistence);

    await service.markReadingAccepted({
      measuredAt: "2026-07-06T12:00:00.000Z",
      meterId: meter.id,
      organizationId: "org_north",
    });

    expect(persistence.findMeterById("org_north", meter.id)).toMatchObject({
      lastReadingAt: "2026-07-06T12:00:00.000Z",
      status: "online",
    });
  });
});
