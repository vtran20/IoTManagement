import type {
  AlertEvent,
  AlertRule,
  Building,
  Floor,
  Meter,
  Unit,
  UtilityType,
} from "@iot-management/types";
import { IngestReadingDto } from "../readings/dto/ingest-reading.dto";

export const demoReportMonth = "2026-06";
export const demoReadingStart = "2026-04-02T12:00:00.000Z";
export const demoReadingDayCount = 90;

export interface DemoBuildingFixture {
  address: string;
  floorCount: number;
  key: string;
  name: string;
  timezone: string;
  unitsPerFloor: number[];
}

export const demoBuildings: DemoBuildingFixture[] = [
  {
    address: "100 Demo Main St",
    floorCount: 4,
    key: "north-ridge",
    name: "Demo North Ridge",
    timezone: "America/Detroit",
    unitsPerFloor: [4, 4, 4, 4],
  },
  {
    address: "18 Demo Lakeview Ave",
    floorCount: 3,
    key: "lakeview",
    name: "Demo Lakeview Apartments",
    timezone: "America/Detroit",
    unitsPerFloor: [4, 4, 4],
  },
  {
    address: "420 Demo River Rd",
    floorCount: 3,
    key: "riverside",
    name: "Demo Riverside Lofts",
    timezone: "America/Detroit",
    unitsPerFloor: [4, 4, 4],
  },
];

export interface DemoMeterFixture {
  buildingKey: string;
  externalId: string;
  floorName?: string;
  installedAt: string;
  status: Meter["status"];
  unitName?: string;
  utilityType: UtilityType;
}

export const demoAlertRuleFixtures: Array<
  Omit<AlertRule, "id" | "organizationId">
> = [
  {
    conditionType: "high_usage",
    enabled: true,
    name: "Demo high electric usage",
    scopeType: "organization",
    threshold: 350,
    utilityType: "electric",
    windowMinutes: 24 * 60,
  },
  {
    conditionType: "stale_device",
    enabled: true,
    name: "Demo stale meter watch",
    scopeType: "organization",
    utilityType: "water",
    windowMinutes: 24 * 60,
  },
  {
    conditionType: "outage_suspected",
    enabled: true,
    name: "Demo offline meter watch",
    scopeType: "organization",
    utilityType: "electric",
    windowMinutes: 60,
  },
];

export const demoAlertEventFixtures: Array<
  Omit<AlertEvent, "id" | "organizationId" | "ruleId"> & { ruleName: string }
> = [
  {
    message: "Demo portfolio exceeded the expected electric usage window.",
    ruleName: "Demo high electric usage",
    severity: "warning",
    status: "open",
    title: "High usage",
    triggeredAt: "2026-06-30T15:00:00.000Z",
  },
  {
    message: "demo-lakeview-202-water has not reported within 24 hours.",
    ruleName: "Demo stale meter watch",
    severity: "warning",
    status: "open",
    title: "Device stale",
    triggeredAt: "2026-06-30T16:00:00.000Z",
  },
  {
    message: "demo-riverside-shared-electric is offline.",
    ruleName: "Demo offline meter watch",
    severity: "critical",
    status: "open",
    title: "Outage suspected",
    triggeredAt: "2026-06-30T17:00:00.000Z",
  },
];

export function demoFloorFixtures() {
  return demoBuildings.flatMap((building) =>
    Array.from({ length: building.floorCount }, (_, index) => ({
      buildingKey: building.key,
      level: index + 1,
      name: `Level ${index + 1}`,
    })),
  );
}

export function demoUnitFixtures() {
  return demoBuildings.flatMap((building) =>
    building.unitsPerFloor.flatMap((unitCount, floorIndex) =>
      Array.from({ length: unitCount }, (_, unitIndex) => {
        const level = floorIndex + 1;
        const unitNumber = `${level}${String(unitIndex + 1).padStart(2, "0")}`;
        return {
          buildingKey: building.key,
          floorName: `Level ${level}`,
          name: unitNumber,
          occupancyStatus:
            unitIndex === unitCount - 1 && level === building.floorCount
              ? ("vacant" as const)
              : ("occupied" as const),
        };
      }),
    ),
  );
}

export function demoMeterFixtures(): DemoMeterFixture[] {
  const unitMeters = demoUnitFixtures()
    .slice(0, 20)
    .flatMap((unit) =>
      (["water", "electric"] as const).map((utilityType) => ({
        buildingKey: unit.buildingKey,
        externalId: `demo-${unit.buildingKey}-${unit.name}-${utilityType}`,
        floorName: unit.floorName,
        installedAt: "2026-03-15T00:00:00.000Z",
        status: demoStatusFor(unit.buildingKey, unit.name, utilityType),
        unitName: unit.name,
        utilityType,
      })),
    );

  return [
    ...unitMeters,
    {
      buildingKey: "north-ridge",
      externalId: "demo-north-ridge-shared-water",
      installedAt: "2026-03-10T00:00:00.000Z",
      status: "online",
      utilityType: "water",
    },
    {
      buildingKey: "lakeview",
      externalId: "demo-lakeview-shared-electric",
      installedAt: "2026-03-10T00:00:00.000Z",
      status: "online",
      utilityType: "electric",
    },
    {
      buildingKey: "riverside",
      externalId: "demo-riverside-shared-electric",
      installedAt: "2026-03-10T00:00:00.000Z",
      status: "offline",
      utilityType: "electric",
    },
  ];
}

export function demoReadingsForMeters(
  meters: Array<Pick<Meter, "externalId" | "unitId" | "utilityType">>,
): IngestReadingDto[] {
  return meters.flatMap((meter, meterIndex) =>
    Array.from({ length: demoReadingDayCount }, (_, dayIndex) => {
      const measuredAt = new Date(demoReadingStart);
      measuredAt.setUTCDate(measuredAt.getUTCDate() + dayIndex);
      return {
        measuredAt: measuredAt.toISOString(),
        meterExternalId: meter.externalId,
        readingKind: "interval" as const,
        unit:
          meter.utilityType === "water"
            ? ("gallon" as const)
            : ("kwh" as const),
        utilityType: meter.utilityType,
        value: demoReadingValue(meter, meterIndex, dayIndex),
      };
    }),
  );
}

export function demoCounts() {
  return {
    alertEventCount: demoAlertEventFixtures.length,
    alertRuleCount: demoAlertRuleFixtures.length,
    buildingCount: demoBuildings.length,
    floorCount: demoFloorFixtures().length,
    meterCount: demoMeterFixtures().length,
    unitCount: demoUnitFixtures().length,
  };
}

export function demoMeterFinalStatus(externalId: string): Meter["status"] {
  return (
    demoMeterFixtures().find((meter) => meter.externalId === externalId)
      ?.status ?? "online"
  );
}

export function isDemoBuilding(building: Building): boolean {
  return demoBuildings.some((fixture) => fixture.name === building.name);
}

export function isDemoFloor(floor: Floor): boolean {
  return floor.name.startsWith("Level ");
}

export function isDemoUnit(unit: Unit): boolean {
  return /^\d{3}$/.test(unit.name);
}

function demoStatusFor(
  buildingKey: string,
  unitName: string,
  utilityType: UtilityType,
): Meter["status"] {
  if (
    buildingKey === "lakeview" &&
    unitName === "102" &&
    utilityType === "water"
  ) {
    return "stale";
  }
  if (
    buildingKey === "north-ridge" &&
    unitName === "104" &&
    utilityType === "water"
  ) {
    return "stale";
  }
  return "online";
}

function demoReadingValue(
  meter: Pick<Meter, "externalId" | "unitId" | "utilityType">,
  meterIndex: number,
  dayIndex: number,
): number {
  const weeklyFactor = dayIndex % 7 === 5 || dayIndex % 7 === 6 ? 1.12 : 1;
  const sharedFactor = meter.unitId ? 1 : 4.2;
  const base = meter.utilityType === "water" ? 62 : 10.5;
  const variance =
    (meterIndex % 9) * (meter.utilityType === "water" ? 3.5 : 0.8);
  const trend = dayIndex >= 70 ? 1.08 : 1;
  return (
    Math.round((base + variance) * weeklyFactor * sharedFactor * trend * 1000) /
    1000
  );
}
