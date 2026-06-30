import type {
  AlertEvent,
  Building,
  DeviceHealthItem,
  Unit,
  UtilityType,
} from "@iot-management/types";

export interface DemoMeter {
  id: string;
  externalId: string;
  buildingId: string;
  unitId?: string;
  utilityType: UtilityType;
  status: DeviceHealthItem["status"];
  lastReadingAt?: string;
  label: string;
}

export interface DemoReportRow {
  name: string;
  waterGallons: number;
  electricKwh: number;
  cost: string;
}

export const demoUser = {
  email: "owner@north.example",
  name: "North Owner",
  password: "password123",
};

export const buildings: Building[] = [
  {
    id: "building_north_ridge",
    organizationId: "org_north",
    name: "North Ridge Mixed Use Building With A Very Long Operational Name",
    address: "100 Main St",
    timezone: "America/Detroit",
  },
  {
    id: "building_lakeview",
    organizationId: "org_north",
    name: "Lakeview Apartments",
    address: "18 Lakeview Ave",
    timezone: "America/Detroit",
  },
];

export const units: Unit[] = [
  {
    id: "unit_1201",
    organizationId: "org_north",
    buildingId: "building_north_ridge",
    name: "Apartment 1201 With Long Tenant Label",
    occupancyStatus: "occupied",
  },
  {
    id: "unit_0802",
    organizationId: "org_north",
    buildingId: "building_lakeview",
    name: "Unit 802",
    occupancyStatus: "vacant",
  },
];

export const meters: DemoMeter[] = [
  {
    id: "meter_water_1",
    buildingId: "building_north_ridge",
    externalId: "nr-water-main-riser-meter-with-long-id-0001",
    label: "Main Water Riser Meter With Extremely Long Identifier",
    lastReadingAt: "2026-06-30T08:45:00.000Z",
    status: "online",
    unitId: "unit_1201",
    utilityType: "water",
  },
  {
    id: "meter_electric_1",
    buildingId: "building_north_ridge",
    externalId: "nr-electric-common-area-0002",
    label: "Common Area Electric",
    lastReadingAt: "2026-06-30T08:35:00.000Z",
    status: "offline",
    unitId: "unit_1201",
    utilityType: "electric",
  },
  {
    id: "meter_water_2",
    buildingId: "building_lakeview",
    externalId: "lakeview-water-0802",
    label: "Lakeview Water 802",
    lastReadingAt: "2026-06-29T18:10:00.000Z",
    status: "stale",
    unitId: "unit_0802",
    utilityType: "water",
  },
];

export const alerts: AlertEvent[] = [
  {
    id: "alert_leak_1",
    message: "Continuous water usage detected after midnight",
    organizationId: "org_north",
    ruleId: "rule_leak",
    severity: "critical",
    status: "open",
    title: "Leak suspected",
    triggeredAt: "2026-06-30T02:30:00.000Z",
  },
  {
    id: "alert_stale_1",
    message: "Lakeview water meter has not reported recently",
    organizationId: "org_north",
    ruleId: "rule_stale",
    severity: "warning",
    status: "open",
    title: "Device stale",
    triggeredAt: "2026-06-30T08:00:00.000Z",
  },
];

export const reportRows: DemoReportRow[] = [
  {
    cost: "$1,284.40",
    electricKwh: 42817,
    name: "June 2026 Monthly Usage",
    waterGallons: 128440,
  },
  {
    cost: "$842.18",
    electricKwh: 29118,
    name: "Lakeview Apartments",
    waterGallons: 74220,
  },
];

export const overview = {
  alertCount: 2,
  electricUsage: "42,817 kWh",
  estimatedCost: "$2,126.58",
  health: "2 online / 1 stale",
  waterUsage: "128,440 gal",
};

export function buildingName(buildingId: string): string {
  return (
    buildings.find((building) => building.id === buildingId)?.name ?? buildingId
  );
}

export function unitName(unitId?: string): string {
  if (!unitId) {
    return "Building shared";
  }
  return units.find((unit) => unit.id === unitId)?.name ?? unitId;
}
