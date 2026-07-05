export type EntityId = string;
export type ISODateTime = string;
export type ResourceLifecycleStatus = "active" | "archived";

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

export const leakIncidentSources = [
  "manual_report",
  "meter_anomaly",
  "moisture_sensor",
] as const;
export type LeakIncidentSource = (typeof leakIncidentSources)[number];

export const leakIncidentStatuses = [
  "open",
  "acknowledged",
  "investigating",
  "contained",
  "monitoring",
  "resolved",
] as const;
export type LeakIncidentStatus = (typeof leakIncidentStatuses)[number];

export const leakIncidentResolutionCategories = [
  "leak_fixed",
  "false_positive",
  "planned_usage",
  "sensor_fault",
  "other",
] as const;
export type LeakIncidentResolutionCategory =
  (typeof leakIncidentResolutionCategories)[number];

export const incidentActivityTypes = [
  "opened",
  "acknowledged",
  "investigating",
  "contained",
  "monitoring",
  "resolved",
  "note",
  "work_order_created",
  "work_order_assigned",
  "work_order_started",
  "work_order_completed",
  "work_order_cancelled",
  "work_order_due_date_changed",
  "work_order_updated",
] as const;
export type IncidentActivityType = (typeof incidentActivityTypes)[number];

export interface LeakIncident {
  id: EntityId;
  organizationId: EntityId;
  buildingId: EntityId;
  unitId?: EntityId;
  meterId?: EntityId;
  source: LeakIncidentSource;
  severity: AlertSeverity;
  status: LeakIncidentStatus;
  title: string;
  description: string;
  detectedAt: ISODateTime;
  acknowledgedAt?: ISODateTime;
  investigatingAt?: ISODateTime;
  containedAt?: ISODateTime;
  monitoringAt?: ISODateTime;
  resolvedAt?: ISODateTime;
  resolutionCategory?: LeakIncidentResolutionCategory;
  resolutionNote?: string;
  estimatedExcessWater?: number;
  estimatedExcessCost?: number;
}

export interface IncidentActivity {
  id: EntityId;
  organizationId: EntityId;
  incidentId: EntityId;
  actorUserId?: EntityId;
  type: IncidentActivityType;
  summary: string;
  createdAt: ISODateTime;
}

export const workOrderPriorities = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type WorkOrderPriority = (typeof workOrderPriorities)[number];

export const workOrderStatuses = [
  "open",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type WorkOrderStatus = (typeof workOrderStatuses)[number];

export interface WorkOrder {
  id: EntityId;
  organizationId: EntityId;
  incidentId: EntityId;
  buildingId: EntityId;
  unitId?: EntityId;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedMembershipId?: EntityId;
  dueAt?: ISODateTime;
  completionNote?: string;
  completedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface LeakDetectionPolicy {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  scopeType: AlertScopeType;
  scopeId?: EntityId;
  minimumIntervalUsage: number;
  minimumConsecutiveIntervals: number;
  maximumIntervalGapMinutes: number;
  severity: AlertSeverity;
  enabled: boolean;
}

export interface IncidentEvidence {
  id: EntityId;
  organizationId: EntityId;
  incidentId: EntityId;
  policyId?: EntityId;
  meterId: EntityId;
  readingIds: EntityId[];
  windowStartedAt: ISODateTime;
  windowEndedAt: ISODateTime;
  observedUsage: number;
  thresholdUsage: number;
  createdAt: ISODateTime;
}

export const moistureSensorSources = ["simulated"] as const;
export type MoistureSensorSource = (typeof moistureSensorSources)[number];

export const moistureSensorStatuses = [
  "online",
  "offline",
  "disabled",
] as const;
export type MoistureSensorStatus = (typeof moistureSensorStatuses)[number];

export const moistureStates = ["dry", "wet"] as const;
export type MoistureState = (typeof moistureStates)[number];

export interface MoistureSensor {
  id: EntityId;
  organizationId: EntityId;
  buildingId: EntityId;
  unitId?: EntityId;
  externalId: string;
  name: string;
  source: MoistureSensorSource;
  status: MoistureSensorStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface MoistureSensorEvent {
  id: EntityId;
  organizationId: EntityId;
  sensorId: EntityId;
  state: MoistureState;
  measuredAt: ISODateTime;
  receivedAt: ISODateTime;
}

export interface IncidentSensorEvidence {
  id: EntityId;
  organizationId: EntityId;
  incidentId: EntityId;
  sensorId: EntityId;
  sensorEventId: EntityId;
  createdAt: ISODateTime;
}

export interface IncidentCorrelationSettings {
  organizationId: EntityId;
  moistureCorrelationWindowMinutes: number;
  updatedAt: ISODateTime;
}

export interface LeakBaselineSettings {
  organizationId: EntityId;
  enabled: boolean;
  minimumValidDays: number;
  thresholdMultiplier: number;
  updatedAt: ISODateTime;
}

export const incidentNotificationChannels = ["in_app", "email"] as const;
export type IncidentNotificationChannel =
  (typeof incidentNotificationChannels)[number];

export const incidentNotificationKinds = [
  "incident_opened",
  "acknowledgement_overdue",
] as const;
export type IncidentNotificationKind =
  (typeof incidentNotificationKinds)[number];

export const incidentNotificationStatuses = [
  "queued",
  "delivered",
  "suppressed",
] as const;
export type IncidentNotificationStatus =
  (typeof incidentNotificationStatuses)[number];

export interface IncidentResponderSettings {
  organizationId: EntityId;
  emailEnabled: boolean;
  criticalAcknowledgementDeadlineMinutes: number;
  warningAcknowledgementDeadlineMinutes: number;
  updatedAt: ISODateTime;
}

export interface IncidentNotification {
  id: EntityId;
  organizationId: EntityId;
  incidentId: EntityId;
  recipientMembershipId: EntityId;
  channel: IncidentNotificationChannel;
  kind: IncidentNotificationKind;
  status: IncidentNotificationStatus;
  dedupeKey: string;
  emailOutboxId?: EntityId;
  createdAt: ISODateTime;
  readAt?: ISODateTime;
}

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
  lifecycleStatus?: ResourceLifecycleStatus;
  archivedAt?: ISODateTime;
}

export interface Floor {
  id: EntityId;
  organizationId: EntityId;
  buildingId: EntityId;
  name: string;
  level: number;
  lifecycleStatus?: ResourceLifecycleStatus;
  archivedAt?: ISODateTime;
}

export interface Unit {
  id: EntityId;
  organizationId: EntityId;
  buildingId: EntityId;
  floorId?: EntityId;
  name: string;
  occupancyStatus: "occupied" | "vacant" | "maintenance";
  lifecycleStatus?: ResourceLifecycleStatus;
  archivedAt?: ISODateTime;
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
  lifecycleStatus?: ResourceLifecycleStatus;
  archivedAt?: ISODateTime;
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
  incidentId?: EntityId;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  triggeredAt: ISODateTime;
  acknowledgedAt?: ISODateTime;
  resolvedAt?: ISODateTime;
}

export interface AlertIncidentSummary {
  id: EntityId;
  status: LeakIncidentStatus;
  title: string;
}
