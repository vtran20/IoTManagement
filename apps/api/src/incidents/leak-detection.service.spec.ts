import { describe, expect, it } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { LeakDetectionService } from "./leak-detection.service";

describe("LeakDetectionService", () => {
  it("opens a meter-anomaly incident after consecutive valid water intervals", async () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      name: "Detection Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const meter = persistence.createMeter({
      buildingId: building.id,
      externalId: "detection-water",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    persistence.createLeakDetectionPolicy({
      maximumIntervalGapMinutes: 20,
      minimumConsecutiveIntervals: 3,
      minimumIntervalUsage: 0.5,
      name: "Continuous flow",
      organizationId: "org_north",
      scopeId: meter.id,
      scopeType: "meter",
      severity: "critical",
    });
    const readings = [
      "2026-07-03T00:00:00.000Z",
      "2026-07-03T00:15:00.000Z",
      "2026-07-03T00:30:00.000Z",
    ].map((measuredAt) =>
      persistence.createReading({
        measuredAt,
        meterId: meter.id,
        organizationId: "org_north",
        quality: "good",
        readingKind: "interval",
        receivedAt: measuredAt,
        unit: "gallon",
        utilityType: "water",
        value: 0.75,
      }),
    );

    const service = new LeakDetectionService(
      persistence,
      noopNotifications as never,
    );
    await service.evaluateAcceptedReading({
      meter,
      organizationId: "org_north",
      reading: readings[2]!,
    });

    expect(
      persistence.listLeakIncidents({ organizationId: "org_north" }),
    ).toEqual([
      expect.objectContaining({
        buildingId: building.id,
        meterId: meter.id,
        severity: "critical",
        source: "meter_anomaly",
        status: "open",
      }),
    ]);
  });

  it("deduplicates a new unresolved incident after an earlier incident was resolved", async () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      name: "Deduplication Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const meter = persistence.createMeter({
      buildingId: building.id,
      externalId: "dedup-water",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    const policy = persistence.createLeakDetectionPolicy({
      maximumIntervalGapMinutes: 20,
      minimumConsecutiveIntervals: 3,
      minimumIntervalUsage: 0.5,
      name: "Deduplicate flow",
      organizationId: "org_north",
      scopeId: meter.id,
      scopeType: "meter",
      severity: "critical",
    });
    const service = new LeakDetectionService(
      persistence,
      noopNotifications as never,
    );

    for (const measuredAt of [
      "2026-07-03T00:00:00.000Z",
      "2026-07-03T00:15:00.000Z",
      "2026-07-03T00:30:00.000Z",
    ]) {
      const reading = persistence.createReading({
        measuredAt,
        meterId: meter.id,
        organizationId: "org_north",
        quality: "good",
        readingKind: "interval",
        receivedAt: measuredAt,
        unit: "gallon",
        utilityType: "water",
        value: 0.75,
      });
      await service.evaluateAcceptedReading({
        meter,
        organizationId: "org_north",
        reading,
      });
    }

    const firstIncident = persistence.listLeakIncidents({
      organizationId: "org_north",
    })[0]!;
    persistence.updateLeakIncident("org_north", firstIncident.id, {
      status: "resolved",
    });

    for (const measuredAt of [
      "2026-07-03T00:45:00.000Z",
      "2026-07-03T01:00:00.000Z",
    ]) {
      const reading = persistence.createReading({
        measuredAt,
        meterId: meter.id,
        organizationId: "org_north",
        quality: "good",
        readingKind: "interval",
        receivedAt: measuredAt,
        unit: "gallon",
        utilityType: "water",
        value: 0.75,
      });
      await service.evaluateAcceptedReading({
        meter,
        organizationId: "org_north",
        reading,
      });
    }

    expect(
      persistence.listLeakIncidents({ organizationId: "org_north" }),
    ).toHaveLength(2);
  });

  it("does not bridge a stale gap or invalid reading into a continuous-flow incident", async () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      name: "Gap Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const meter = persistence.createMeter({
      buildingId: building.id,
      externalId: "gap-water",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    persistence.createLeakDetectionPolicy({
      maximumIntervalGapMinutes: 20,
      minimumConsecutiveIntervals: 3,
      minimumIntervalUsage: 0.5,
      name: "Gap-aware flow",
      organizationId: "org_north",
      scopeId: meter.id,
      scopeType: "meter",
      severity: "critical",
    });
    const service = new LeakDetectionService(
      persistence,
      noopNotifications as never,
    );

    for (const [measuredAt, quality] of [
      ["2026-07-03T00:00:00.000Z", "good"],
      ["2026-07-03T00:15:00.000Z", "invalid"],
      ["2026-07-03T01:00:00.000Z", "good"],
    ] as const) {
      const reading = persistence.createReading({
        measuredAt,
        meterId: meter.id,
        organizationId: "org_north",
        quality,
        readingKind: "interval",
        receivedAt: measuredAt,
        unit: "gallon",
        utilityType: "water",
        value: 0.75,
      });
      if (quality === "good") {
        await service.evaluateAcceptedReading({
          meter,
          organizationId: "org_north",
          reading,
        });
      }
    }

    expect(
      persistence.listLeakIncidents({ organizationId: "org_north" }),
    ).toEqual([]);
  });
});

const noopNotifications = {
  notifyIncidentOpened: async (): Promise<void> => undefined,
};
