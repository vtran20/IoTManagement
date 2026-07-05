import type {
  AggregatePeriodType,
  AlertEvent,
  EntityId,
  ISODateTime,
  MeterStatus,
  UtilityType,
  WorkOrderPriority,
} from "./domain";
import type { PageResponse } from "./api";

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

export interface DashboardOverviewRange {
  from: ISODateTime;
  periodType: AggregatePeriodType;
  to: ISODateTime;
}

export interface DashboardOverviewQuery {
  buildingId?: EntityId;
  from?: ISODateTime;
  to?: ISODateTime;
  utilityType?: UtilityType;
}

export interface DashboardOverviewResponse {
  buildings: PageResponse<BuildingBreakdownItem>;
  deviceHealth: DeviceHealthResponse;
  range: DashboardOverviewRange;
  summary: DashboardSummaryResponse;
  trends: PageResponse<UsageTrendPoint>;
  units: PageResponse<UnitRankingItem>;
}

export const dashboardOperationKinds = [
  "alert",
  "incident",
  "meter",
  "work_order",
] as const;

export type DashboardOperationKind = (typeof dashboardOperationKinds)[number];

export interface DashboardOperationItem {
  actionLabel: string;
  assignmentType?: "internal" | "unassigned" | "vendor";
  detectedAt?: ISODateTime;
  dueAt?: ISODateTime;
  href: string;
  id: EntityId;
  isOverdue?: boolean;
  kind: DashboardOperationKind;
  priority?: WorkOrderPriority;
  severity?: AlertEvent["severity"];
  status: string;
  supportingText?: string;
  title: string;
}

export interface DashboardOperationsResponse {
  criticalAlertCount: number;
  generatedAt: ISODateTime;
  incidentsWithoutRepairCount: number;
  items: DashboardOperationItem[];
  offlineMeterCount: number;
  organizationId: EntityId;
  overdueWorkOrderCount: number;
}

export interface DashboardAlertsResponse {
  alerts: AlertEvent[];
}
