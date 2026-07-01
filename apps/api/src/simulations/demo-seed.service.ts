import type {
  AlertEvent,
  AlertRule,
  Building,
  DemoSeedResponse,
  Floor,
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
import {
  demoAlertEventFixtures,
  demoAlertRuleFixtures,
  demoBuildings,
  demoCounts,
  demoFloorFixtures,
  demoMeterFinalStatus,
  demoMeterFixtures,
  demoReadingsForMeters,
  demoReportMonth,
  demoUnitFixtures,
} from "./demo-fixtures";

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
    const buildingsByKey = new Map<string, Building>();
    for (const fixture of demoBuildings) {
      buildingsByKey.set(
        fixture.key,
        await this.ensureBuilding(organizationId, fixture),
      );
    }

    const floorsByBuildingAndName = new Map<string, Floor>();
    for (const fixture of demoFloorFixtures()) {
      const building = buildingsByKey.get(fixture.buildingKey)!;
      const floor = await this.ensureFloor(organizationId, building, fixture);
      floorsByBuildingAndName.set(floorKey(building.id, floor.name), floor);
    }

    const unitsByBuildingAndName = new Map<string, Unit>();
    for (const fixture of demoUnitFixtures()) {
      const building = buildingsByKey.get(fixture.buildingKey)!;
      const floor = floorsByBuildingAndName.get(
        floorKey(building.id, fixture.floorName),
      );
      const unit = await this.ensureUnit(
        organizationId,
        building,
        fixture,
        floor,
      );
      unitsByBuildingAndName.set(unitKey(building.id, unit.name), unit);
    }

    const meters: Meter[] = [];
    for (const fixture of demoMeterFixtures()) {
      const building = buildingsByKey.get(fixture.buildingKey)!;
      const floor = fixture.floorName
        ? floorsByBuildingAndName.get(floorKey(building.id, fixture.floorName))
        : undefined;
      const unit = fixture.unitName
        ? unitsByBuildingAndName.get(unitKey(building.id, fixture.unitName))
        : undefined;
      meters.push(
        await this.ensureMeter(organizationId, building, fixture, floor, unit),
      );
    }

    let acceptedReadingCount = 0;
    let duplicateReadingCount = 0;
    for (const reading of demoReadingsForMeters(meters)) {
      const result = await this.readingsService.ingest(context, reading);
      if (result.duplicate) {
        duplicateReadingCount += 1;
      } else if (result.accepted) {
        acceptedReadingCount += 1;
      }
    }

    for (const meter of meters) {
      const status = demoMeterFinalStatus(meter.externalId);
      if (status !== "online") {
        await this.persistence.updateMeter(organizationId, meter.id, {
          status,
        });
      }
    }

    const aggregates = [
      ...(await this.aggregationService.aggregate({
        organizationId,
        periodType: "hour",
      })),
      ...(await this.aggregationService.aggregate({
        organizationId,
        periodType: "day",
      })),
      ...(await this.aggregationService.aggregate({
        organizationId,
        periodType: "month",
      })),
    ];

    const rules = await this.ensureAlertRules(organizationId);
    const events = await this.ensureAlertEvents(organizationId, rules);
    const counts = demoCounts();

    return {
      acceptedReadingCount,
      aggregateCount: aggregates.filter((aggregate) =>
        meters.some((meter) => meter.id === aggregate.meterId),
      ).length,
      alertEventCount: events.length,
      alertRuleCount: rules.length,
      buildingCount: counts.buildingCount,
      duplicateReadingCount,
      floorCount: counts.floorCount,
      meterCount: meters.length,
      reportMonth: demoReportMonth,
      unitCount: counts.unitCount,
    };
  }

  async resetDemoData(context: RequestContext): Promise<void> {
    await this.persistence.resetDemoData(context.organization.id);
  }

  private async ensureBuilding(
    organizationId: string,
    fixture: (typeof demoBuildings)[number],
  ): Promise<Building> {
    const existing = (
      await this.persistence.listBuildings(organizationId)
    ).find((building) => building.name === fixture.name);
    return (
      existing ??
      (await this.persistence.createBuilding({
        address: fixture.address,
        name: fixture.name,
        organizationId,
        timezone: fixture.timezone,
      }))
    );
  }

  private async ensureFloor(
    organizationId: string,
    building: Building,
    fixture: ReturnType<typeof demoFloorFixtures>[number],
  ): Promise<Floor> {
    const existing = (
      await this.persistence.listFloors(organizationId, building.id)
    ).find((floor) => floor.name === fixture.name);
    return (
      existing ??
      (await this.persistence.createFloor({
        buildingId: building.id,
        level: fixture.level,
        name: fixture.name,
        organizationId,
      }))
    );
  }

  private async ensureUnit(
    organizationId: string,
    building: Building,
    fixture: ReturnType<typeof demoUnitFixtures>[number],
    floor?: Floor,
  ): Promise<Unit> {
    const existing = (
      await this.persistence.listUnits({
        buildingId: building.id,
        organizationId,
      })
    ).find((unit) => unit.name === fixture.name);
    return (
      existing ??
      (await this.persistence.createUnit({
        buildingId: building.id,
        floorId: floor?.id,
        name: fixture.name,
        occupancyStatus: fixture.occupancyStatus,
        organizationId,
      }))
    );
  }

  private async ensureMeter(
    organizationId: string,
    building: Building,
    fixture: ReturnType<typeof demoMeterFixtures>[number],
    floor?: Floor,
    unit?: Unit,
  ): Promise<Meter> {
    const existing = await this.persistence.findMeterByExternalId(
      organizationId,
      fixture.externalId,
    );
    return (
      existing ??
      (await this.persistence.createMeter({
        buildingId: building.id,
        externalId: fixture.externalId,
        floorId: floor?.id,
        installedAt: fixture.installedAt,
        organizationId,
        source: "simulated",
        status: fixture.status,
        unitId: unit?.id,
        utilityType: fixture.utilityType,
      }))
    );
  }

  private async ensureAlertRules(organizationId: string): Promise<AlertRule[]> {
    const existing = await this.persistence.listAlertRules({ organizationId });
    const rules: AlertRule[] = [];
    for (const fixture of demoAlertRuleFixtures) {
      const current = existing.find((rule) => rule.name === fixture.name);
      rules.push(
        current ??
          (await this.persistence.createAlertRule({
            ...fixture,
            organizationId,
          })),
      );
    }
    return rules;
  }

  private async ensureAlertEvents(
    organizationId: string,
    rules: AlertRule[],
  ): Promise<AlertEvent[]> {
    const existing = await this.persistence.listAlertEvents({ organizationId });
    const events: AlertEvent[] = [];
    for (const fixture of demoAlertEventFixtures) {
      const rule = rules.find(
        (candidate) => candidate.name === fixture.ruleName,
      );
      const current = existing.find(
        (event) => event.ruleId === rule?.id && event.title === fixture.title,
      );
      events.push(
        current ??
          (await this.persistence.createAlertEvent({
            message: fixture.message,
            organizationId,
            ruleId: rule?.id,
            severity: fixture.severity,
            title: fixture.title,
            triggeredAt: fixture.triggeredAt,
          })),
      );
    }
    return events;
  }
}

function floorKey(buildingId: string, floorName: string): string {
  return `${buildingId}:${floorName}`;
}

function unitKey(buildingId: string, unitName: string): string {
  return `${buildingId}:${unitName}`;
}
