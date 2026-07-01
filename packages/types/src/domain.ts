export type EntityId = string;
export type ISODateTime = string;

export const userRoles = ["owner", "manager", "viewer", "tenant"] as const;
export type UserRole = (typeof userRoles)[number];

export const utilityTypes = ["water", "electric"] as const;
export type UtilityType = (typeof utilityTypes)[number];

export const meterSources = [
  "simulated",
  "gateway",
  "direct_api",
  "mqtt",
] as const;
export type MeterSource = (typeof meterSources)[number];

export const meterStatuses = [
  "online",
  "offline",
  "stale",
  "disabled",
] as const;
export type MeterStatus = (typeof meterStatuses)[number];

export const readingUnits = ["gallon", "liter", "kwh"] as const;
export type ReadingUnit = (typeof readingUnits)[number];

export const readingKinds = ["cumulative", "interval"] as const;
export type ReadingKind = (typeof readingKinds)[number];

export const readingQualities = [
  "good",
  "estimated",
  "duplicate",
  "invalid",
] as const;
export type ReadingQuality = (typeof readingQualities)[number];

export const aggregatePeriodTypes = ["hour", "day", "month"] as const;
export type AggregatePeriodType = (typeof aggregatePeriodTypes)[number];

export const alertScopeTypes = [
  "organization",
  "building",
  "unit",
  "meter",
] as const;
export type AlertScopeType = (typeof alertScopeTypes)[number];

export const alertConditionTypes = [
  "high_usage",
  "leak_suspected",
  "stale_device",
  "outage_suspected",
] as const;
export type AlertConditionType = (typeof alertConditionTypes)[number];

export const alertSeverities = ["info", "warning", "critical"] as const;
export type AlertSeverity = (typeof alertSeverities)[number];

export const alertStatuses = ["open", "acknowledged", "resolved"] as const;
export type AlertStatus = (typeof alertStatuses)[number];

export interface Organization {
  id: EntityId;
  name: string;
  status: "active" | "disabled";
  createdAt: ISODateTime;
}

export interface User {
  id: EntityId;
  email: string;
  name: string;
  createdAt: ISODateTime;
}

export interface Membership {
  id: EntityId;
  organizationId: EntityId;
  userId: EntityId;
  role: UserRole;
  status?: "active" | "disabled";
}

export interface Building {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  address?: string;
  timezone: string;
}

export interface Floor {
  id: EntityId;
  organizationId: EntityId;
  buildingId: EntityId;
  name: string;
  level: number;
}

export interface Unit {
  id: EntityId;
  organizationId: EntityId;
  buildingId: EntityId;
  floorId?: EntityId;
  name: string;
  occupancyStatus: "occupied" | "vacant" | "maintenance";
}

export interface Meter {
  id: EntityId;
  organizationId: EntityId;
  buildingId: EntityId;
  floorId?: EntityId;
  unitId?: EntityId;
  utilityType: UtilityType;
  source: MeterSource;
  externalId: string;
  status: MeterStatus;
  installedAt?: ISODateTime;
  lastReadingAt?: ISODateTime;
}

export interface MeterReading {
  id: EntityId;
  organizationId: EntityId;
  meterId: EntityId;
  measuredAt: ISODateTime;
  utilityType: UtilityType;
  value: number;
  unit: ReadingUnit;
  readingKind: ReadingKind;
  quality: ReadingQuality;
  receivedAt: ISODateTime;
}

export interface UsageAggregate {
  id: EntityId;
  organizationId: EntityId;
  meterId: EntityId;
  buildingId: EntityId;
  unitId?: EntityId;
  utilityType: UtilityType;
  periodStart: ISODateTime;
  periodEnd: ISODateTime;
  periodType: AggregatePeriodType;
  usageValue: number;
  costEstimate?: number;
}

export interface AlertRule {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  utilityType?: UtilityType;
  scopeType: AlertScopeType;
  scopeId?: EntityId;
  conditionType: AlertConditionType;
  threshold?: number;
  windowMinutes: number;
  enabled: boolean;
}

export interface AlertEvent {
  id: EntityId;
  organizationId: EntityId;
  ruleId?: EntityId;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  triggeredAt: ISODateTime;
  acknowledgedAt?: ISODateTime;
  resolvedAt?: ISODateTime;
}
