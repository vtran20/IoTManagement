import type {
  AlertEvent,
  EntityId,
  ISODateTime,
  MeterStatus,
  UtilityType,
} from "./domain";

export interface UtilitySummary {
  utilityType: UtilityType;
  usageValue: number;
  costEstimate?: number;
  comparisonPercent?: number;
}

export interface DashboardSummaryResponse {
  organizationId: EntityId;
  generatedAt: ISODateTime;
  utilitySummaries: UtilitySummary[];
  openAlertCount: number;
  criticalAlertCount: number;
  offlineMeterCount: number;
  staleMeterCount: number;
}

export interface UsageTrendPoint {
  periodStart: ISODateTime;
  periodEnd: ISODateTime;
  utilityType: UtilityType;
  usageValue: number;
  costEstimate?: number;
}

export interface BuildingBreakdownItem {
  buildingId: EntityId;
  buildingName: string;
  utilityType: UtilityType;
  usageValue: number;
  costEstimate?: number;
}

export interface UnitRankingItem {
  unitId: EntityId;
  unitName: string;
  buildingId: EntityId;
  buildingName: string;
  utilityType: UtilityType;
  usageValue: number;
}

export interface DeviceHealthItem {
  meterId: EntityId;
  externalId: string;
  utilityType: UtilityType;
  status: MeterStatus;
  lastReadingAt?: ISODateTime;
}

export interface DeviceHealthResponse {
  meters: DeviceHealthItem[];
}

export interface DashboardAlertsResponse {
  alerts: AlertEvent[];
}
