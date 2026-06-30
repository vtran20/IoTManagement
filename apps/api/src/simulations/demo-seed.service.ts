import type {
  Building,
  DemoSeedResponse,
  Meter,
  Unit,
} from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { AggregationService } from "../analytics/aggregation.service";
import { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { ReadingsService } from "../readings/readings.service";

@Injectable()
export class DemoSeedService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
    @Inject(ReadingsService)
    private readonly readingsService: ReadingsService,
    @Inject(AggregationService)
    private readonly aggregationService: AggregationService,
  ) {}

  seed(context: RequestContext): DemoSeedResponse {
    const organizationId = context.organization.id;
    const northRidge = this.ensureBuilding(
      organizationId,
      "Demo North Ridge",
      "100 Demo Main St",
    );
    const lakeview = this.ensureBuilding(
      organizationId,
      "Demo Lakeview Apartments",
      "18 Demo Lakeview Ave",
    );
    const unit1201 = this.ensureUnit(organizationId, northRidge, "1201");
    const unit802 = this.ensureUnit(organizationId, lakeview, "802");

    const meters = [
      this.ensureMeter(organizationId, northRidge, unit1201, {
        externalId: "demo-seed-water-1201",
        utilityType: "water",
      }),
      this.ensureMeter(organizationId, northRidge, unit1201, {
        externalId: "demo-seed-electric-1201",
        utilityType: "electric",
      }),
      this.ensureMeter(organizationId, lakeview, unit802, {
        externalId: "demo-seed-water-0802",
        utilityType: "water",
      }),
      this.ensureMeter(organizationId, lakeview, unit802, {
        externalId: "demo-seed-electric-0802",
        utilityType: "electric",
      }),
    ];

    let acceptedReadingCount = 0;
    let duplicateReadingCount = 0;
    for (const reading of demoReadings) {
      const result = this.readingsService.ingest(context, reading);
      if (result.duplicate) {
        duplicateReadingCount += 1;
      } else if (result.accepted) {
        acceptedReadingCount += 1;
      }
    }

    const aggregates = this.aggregationService.aggregate({
      organizationId,
      periodType: "month",
    });

    return {
      acceptedReadingCount,
      aggregateCount: aggregates.filter((aggregate) =>
        meters.some((meter) => meter.id === aggregate.meterId),
      ).length,
      buildingCount: 2,
      duplicateReadingCount,
      meterCount: meters.length,
      reportMonth: "2026-06",
      unitCount: 2,
    };
  }

  private ensureBuilding(
    organizationId: string,
    name: string,
    address: string,
  ): Building {
    const existing = this.persistence
      .listBuildings(organizationId)
      .find((building) => building.name === name);
    return (
      existing ??
      this.persistence.createBuilding({
        address,
        name,
        organizationId,
        timezone: "America/Detroit",
      })
    );
  }

  private ensureUnit(
    organizationId: string,
    building: Building,
    name: string,
  ): Unit {
    const existing = this.persistence
      .listUnits({ buildingId: building.id, organizationId })
      .find((unit) => unit.name === name);
    return (
      existing ??
      this.persistence.createUnit({
        buildingId: building.id,
        name,
        occupancyStatus: "occupied",
        organizationId,
      })
    );
  }

  private ensureMeter(
    organizationId: string,
    building: Building,
    unit: Unit,
    input: Pick<Meter, "externalId" | "utilityType">,
  ): Meter {
    const existing = this.persistence.findMeterByExternalId(
      organizationId,
      input.externalId,
    );
    return (
      existing ??
      this.persistence.createMeter({
        buildingId: building.id,
        externalId: input.externalId,
        organizationId,
        source: "simulated",
        unitId: unit.id,
        utilityType: input.utilityType,
      })
    );
  }
}

const demoReadings = [
  {
    measuredAt: "2026-06-15T12:00:00.000Z",
    meterExternalId: "demo-seed-water-1201",
    readingKind: "interval" as const,
    unit: "gallon" as const,
    utilityType: "water" as const,
    value: 100,
  },
  {
    measuredAt: "2026-06-15T12:00:00.000Z",
    meterExternalId: "demo-seed-electric-1201",
    readingKind: "interval" as const,
    unit: "kwh" as const,
    utilityType: "electric" as const,
    value: 40,
  },
  {
    measuredAt: "2026-06-15T12:00:00.000Z",
    meterExternalId: "demo-seed-water-0802",
    readingKind: "interval" as const,
    unit: "gallon" as const,
    utilityType: "water" as const,
    value: 75,
  },
  {
    measuredAt: "2026-06-15T12:00:00.000Z",
    meterExternalId: "demo-seed-electric-0802",
    readingKind: "interval" as const,
    unit: "kwh" as const,
    utilityType: "electric" as const,
    value: 20,
  },
];
