import type {
  Building,
  DemoSeedResponse,
  Meter,
  Unit,
} from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { AggregationService } from "../analytics/aggregation.service";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { ReadingsService } from "../readings/readings.service";

@Injectable()
export class DemoSeedService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(ReadingsService)
    private readonly readingsService: ReadingsService,
    @Inject(AggregationService)
    private readonly aggregationService: AggregationService,
  ) {}

  async seed(context: RequestContext): Promise<DemoSeedResponse> {
    const organizationId = context.organization.id;
    const northRidge = await this.ensureBuilding(
      organizationId,
      "Demo North Ridge",
      "100 Demo Main St",
    );
    const lakeview = await this.ensureBuilding(
      organizationId,
      "Demo Lakeview Apartments",
      "18 Demo Lakeview Ave",
    );
    const unit1201 = await this.ensureUnit(organizationId, northRidge, "1201");
    const unit802 = await this.ensureUnit(organizationId, lakeview, "802");

    const meters = [
      await this.ensureMeter(organizationId, northRidge, unit1201, {
        externalId: "demo-seed-water-1201",
        utilityType: "water",
      }),
      await this.ensureMeter(organizationId, northRidge, unit1201, {
        externalId: "demo-seed-electric-1201",
        utilityType: "electric",
      }),
      await this.ensureMeter(organizationId, lakeview, unit802, {
        externalId: "demo-seed-water-0802",
        utilityType: "water",
      }),
      await this.ensureMeter(organizationId, lakeview, unit802, {
        externalId: "demo-seed-electric-0802",
        utilityType: "electric",
      }),
    ];

    let acceptedReadingCount = 0;
    let duplicateReadingCount = 0;
    for (const reading of demoReadings) {
      const result = await this.readingsService.ingest(context, reading);
      if (result.duplicate) {
        duplicateReadingCount += 1;
      } else if (result.accepted) {
        acceptedReadingCount += 1;
      }
    }

    const aggregates = await this.aggregationService.aggregate({
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

  private async ensureBuilding(
    organizationId: string,
    name: string,
    address: string,
  ): Promise<Building> {
    const existing = (
      await this.persistence.listBuildings(organizationId)
    ).find((building) => building.name === name);
    return (
      existing ??
      (await this.persistence.createBuilding({
        address,
        name,
        organizationId,
        timezone: "America/Detroit",
      }))
    );
  }

  private async ensureUnit(
    organizationId: string,
    building: Building,
    name: string,
  ): Promise<Unit> {
    const existing = (
      await this.persistence.listUnits({
        buildingId: building.id,
        organizationId,
      })
    ).find((unit) => unit.name === name);
    return (
      existing ??
      (await this.persistence.createUnit({
        buildingId: building.id,
        name,
        occupancyStatus: "occupied",
        organizationId,
      }))
    );
  }

  private async ensureMeter(
    organizationId: string,
    building: Building,
    unit: Unit,
    input: Pick<Meter, "externalId" | "utilityType">,
  ): Promise<Meter> {
    const existing = await this.persistence.findMeterByExternalId(
      organizationId,
      input.externalId,
    );
    return (
      existing ??
      (await this.persistence.createMeter({
        buildingId: building.id,
        externalId: input.externalId,
        organizationId,
        source: "simulated",
        unitId: unit.id,
        utilityType: input.utilityType,
      }))
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
