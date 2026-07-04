import { describe, expect, it } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { LeakBaselineDetectionService } from "./leak-baseline-detection.service";

describe("LeakBaselineDetectionService", () => {
  it("does not evaluate until fourteen distinct valid water-reading days exist", async () => {
    const { meter, persistence } = fixture();
    await persistence.upsertLeakBaselineSettings({
      enabled: true,
      minimumValidDays: 14,
      organizationId: "org_north",
      thresholdMultiplier: 2,
      updatedAt: "2026-06-14T00:00:00.000Z",
    });
    const readings = seedHourlyReadings(persistence, meter.id, 13, 1);

    await new LeakBaselineDetectionService(
      persistence,
      noopNotifications as never,
    ).evaluateAcceptedReading({
      meter,
      organizationId: "org_north",
      reading: readings[12]!,
    });

    expect(
      persistence.listLeakIncidents({ organizationId: "org_north" }),
    ).toHaveLength(0);
  });

  it("opens one incident and appends evidence after a baseline threshold breach", async () => {
    const { meter, persistence } = fixture();
    await persistence.upsertLeakBaselineSettings({
      enabled: true,
      minimumValidDays: 14,
      organizationId: "org_north",
      thresholdMultiplier: 2,
      updatedAt: "2026-06-14T00:00:00.000Z",
    });
    seedHourlyReadings(persistence, meter.id, 14, 1);
    const first = createReading(
      persistence,
      meter.id,
      "2026-06-15T08:00:00.000Z",
      5,
    );
    const second = createReading(
      persistence,
      meter.id,
      "2026-06-16T08:00:00.000Z",
      5,
    );
    const service = new LeakBaselineDetectionService(
      persistence,
      noopNotifications as never,
    );

    await service.evaluateAcceptedReading({
      meter,
      organizationId: "org_north",
      reading: first,
    });
    await service.evaluateAcceptedReading({
      meter,
      organizationId: "org_north",
      reading: second,
    });

    const incidents = persistence.listLeakIncidents({
      organizationId: "org_north",
    });
    expect(incidents).toEqual([
      expect.objectContaining({
        meterId: meter.id,
        source: "meter_anomaly",
        status: "open",
      }),
    ]);
    expect(
      persistence.listIncidentEvidence({
        incidentId: incidents[0]!.id,
        organizationId: "org_north",
      }),
    ).toHaveLength(2);
  });
});

function fixture() {
  const persistence = new InMemoryPersistenceService();
  const building = persistence.createBuilding({
    organizationId: "org_north",
    name: "Baseline Tower",
    timezone: "America/Detroit",
  });
  const meter = persistence.createMeter({
    buildingId: building.id,
    externalId: "baseline-water",
    organizationId: "org_north",
    source: "simulated",
    utilityType: "water",
  });
  return { meter, persistence };
}

function seedHourlyReadings(
  persistence: InMemoryPersistenceService,
  meterId: string,
  count: number,
  value: number,
) {
  return Array.from({ length: count }, (_, index) =>
    createReading(
      persistence,
      meterId,
      `2026-06-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
      value,
    ),
  );
}

function createReading(
  persistence: InMemoryPersistenceService,
  meterId: string,
  measuredAt: string,
  value: number,
) {
  return persistence.createReading({
    measuredAt,
    meterId,
    organizationId: "org_north",
    quality: "good",
    readingKind: "interval",
    receivedAt: measuredAt,
    unit: "gallon",
    utilityType: "water",
    value,
  });
}

const noopNotifications = {
  notifyIncidentOpened: async () => undefined,
};
