import { describe, expect, it } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { AggregationService } from "./aggregation.service";
import { CostEstimateService } from "./cost-estimate.service";
import { UsageQueryService } from "./usage-query.service";

describe("AggregationService", () => {
  it("calculates interval usage from cumulative readings", () => {
    const service = createAggregationService();

    const usage = service.calculateIntervalUsage([
      reading({ measuredAt: "2026-06-29T00:00:00.000Z", value: 100 }),
      reading({ measuredAt: "2026-06-29T01:00:00.000Z", value: 112.5 }),
      reading({ measuredAt: "2026-06-29T02:00:00.000Z", value: 121 }),
    ]);

    expect(usage.map((item) => item.usageValue)).toEqual([12.5, 8.5]);
    expect(usage[0]).toMatchObject({
      periodStart: "2026-06-29T01:00:00.000Z",
      utilityType: "water",
    });
  });

  it("aggregates hourly usage for water and electric independently", () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      name: "Analytics Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const water = persistence.createMeter({
      buildingId: building.id,
      externalId: "agg-water",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    const electric = persistence.createMeter({
      buildingId: building.id,
      externalId: "agg-electric",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "electric",
    });
    persistence.createReading({
      measuredAt: "2026-06-29T10:10:00.000Z",
      meterId: water.id,
      organizationId: "org_north",
      readingKind: "interval",
      receivedAt: "2026-06-29T10:10:10.000Z",
      unit: "gallon",
      utilityType: "water",
      value: 3,
    });
    persistence.createReading({
      measuredAt: "2026-06-29T10:35:00.000Z",
      meterId: water.id,
      organizationId: "org_north",
      quality: "invalid",
      readingKind: "interval",
      receivedAt: "2026-06-29T10:35:10.000Z",
      unit: "gallon",
      utilityType: "water",
      value: 100,
    });
    persistence.createReading({
      measuredAt: "2026-06-29T10:20:00.000Z",
      meterId: electric.id,
      organizationId: "org_north",
      readingKind: "interval",
      receivedAt: "2026-06-29T10:20:10.000Z",
      unit: "kwh",
      utilityType: "electric",
      value: 7,
    });

    const aggregates = createAggregationService(persistence).aggregate({
      organizationId: "org_north",
      periodType: "hour",
    });

    expect(aggregates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ utilityType: "water", usageValue: 3 }),
        expect.objectContaining({ utilityType: "electric", usageValue: 7 }),
      ]),
    );
    expect(aggregates).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ usageValue: 100 })]),
    );
  });

  it("aggregates daily and monthly usage", () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      name: "Period Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const meter = persistence.createMeter({
      buildingId: building.id,
      externalId: "period-water",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    for (const [measuredAt, value] of [
      ["2026-06-01T12:00:00.000Z", 2],
      ["2026-06-01T13:00:00.000Z", 3],
      ["2026-06-02T12:00:00.000Z", 5],
    ] as const) {
      persistence.createReading({
        measuredAt,
        meterId: meter.id,
        organizationId: "org_north",
        readingKind: "interval",
        receivedAt: measuredAt,
        unit: "gallon",
        utilityType: "water",
        value,
      });
    }
    const service = createAggregationService(persistence);

    const daily = service.aggregate({
      organizationId: "org_north",
      periodType: "day",
    });
    const monthly = service.aggregate({
      organizationId: "org_north",
      periodType: "month",
    });

    expect(daily).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          periodStart: "2026-06-01T00:00:00.000Z",
          usageValue: 5,
        }),
        expect.objectContaining({
          periodStart: "2026-06-02T00:00:00.000Z",
          usageValue: 5,
        }),
      ]),
    );
    expect(monthly).toEqual([
      expect.objectContaining({
        periodStart: "2026-06-01T00:00:00.000Z",
        usageValue: 10,
      }),
    ]);
  });

  it("calculates cost estimates from utility rates", () => {
    const service = new CostEstimateService({
      electricPerKwh: 0.16,
      waterPerGallon: 0.004,
    });

    expect(service.estimate("electric", 42)).toBe(6.72);
    expect(service.estimate("water", 250)).toBe(1);
  });
});

describe("UsageQueryService", () => {
  it("returns trends, building breakdown, unit rankings, and device health", () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      name: "Dashboard Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const unit = persistence.createUnit({
      buildingId: building.id,
      name: "101",
      occupancyStatus: "occupied",
      organizationId: "org_north",
    });
    const meter = persistence.createMeter({
      buildingId: building.id,
      externalId: "dash-water",
      lastReadingAt: "2026-06-29T10:00:00.000Z",
      organizationId: "org_north",
      source: "simulated",
      status: "online",
      unitId: unit.id,
      utilityType: "water",
    });
    persistence.createUsageAggregate({
      buildingId: building.id,
      meterId: meter.id,
      organizationId: "org_north",
      periodEnd: "2026-06-29T11:00:00.000Z",
      periodStart: "2026-06-29T10:00:00.000Z",
      periodType: "hour",
      unitId: unit.id,
      usageValue: 12,
      utilityType: "water",
    });

    const service = new UsageQueryService(
      persistence,
      new CostEstimateService(),
    );

    expect(service.getTrends({ organizationId: "org_north" }).items).toEqual([
      expect.objectContaining({ usageValue: 12, utilityType: "water" }),
    ]);
    expect(
      service.getBuildingBreakdown({ organizationId: "org_north" }).items,
    ).toEqual([
      expect.objectContaining({
        buildingId: building.id,
        buildingName: "Dashboard Tower",
        usageValue: 12,
      }),
    ]);
    expect(
      service.getUnitRankings({ organizationId: "org_north" }).items,
    ).toEqual([
      expect.objectContaining({
        unitId: unit.id,
        unitName: "101",
        usageValue: 12,
      }),
    ]);
    expect(
      service.getDeviceHealth({
        now: "2026-06-29T10:30:00.000Z",
        organizationId: "org_north",
      }).meters,
    ).toEqual([
      expect.objectContaining({
        externalId: "dash-water",
        status: "online",
      }),
    ]);
  });

  it("reports online, stale, offline, and disabled device health states", () => {
    const persistence = new InMemoryPersistenceService();
    const building = persistence.createBuilding({
      name: "Health Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    for (const [externalId, status, lastReadingAt] of [
      ["health-online", "online", "2026-06-29T10:30:00.000Z"],
      ["health-stale", "online", "2026-06-29T07:00:00.000Z"],
      ["health-offline", "offline", undefined],
      ["health-disabled", "disabled", undefined],
    ] as const) {
      persistence.createMeter({
        buildingId: building.id,
        externalId,
        lastReadingAt,
        organizationId: "org_north",
        source: "simulated",
        status,
        utilityType: "water",
      });
    }

    const service = new UsageQueryService(
      persistence,
      new CostEstimateService(),
    );

    expect(
      service.getDeviceHealth({
        now: "2026-06-29T11:00:00.000Z",
        organizationId: "org_north",
      }).meters,
    ).toEqual([
      expect.objectContaining({
        externalId: "health-online",
        status: "online",
      }),
      expect.objectContaining({ externalId: "health-stale", status: "stale" }),
      expect.objectContaining({
        externalId: "health-offline",
        status: "offline",
      }),
      expect.objectContaining({
        externalId: "health-disabled",
        status: "disabled",
      }),
    ]);
  });
});

function createAggregationService(
  persistence = new InMemoryPersistenceService(),
) {
  return new AggregationService(persistence, new CostEstimateService());
}

function reading(input: {
  measuredAt: string;
  value: number;
  utilityType?: "water" | "electric";
}) {
  return {
    id: `reading_${input.measuredAt}`,
    measuredAt: input.measuredAt,
    meterId: "meter_1",
    organizationId: "org_north",
    quality: "good" as const,
    readingKind: "cumulative" as const,
    receivedAt: input.measuredAt,
    unit:
      input.utilityType === "electric" ? ("kwh" as const) : ("gallon" as const),
    utilityType: input.utilityType ?? ("water" as const),
    value: input.value,
  };
}
