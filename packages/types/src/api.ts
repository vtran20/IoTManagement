import type {
  AlertEvent,
  AlertRule,
  AlertSeverity,
  AlertScopeType,
  AlertStatus,
  Building,
  EntityId,
  Floor,
  ISODateTime,
  LeakIncident,
  IncidentActivity,
  IncidentEvidence,
  IncidentNotification,
  IncidentResponderSettings,
  LeakIncidentResolutionCategory,
  LeakIncidentSource,
  LeakDetectionPolicy,
  Meter,
  MeterReading,
  MeterSource,
  MeterStatus,
  Membership,
  Organization,
  ReadingKind,
  ReadingUnit,
  Unit,
  UsageAggregate,
  User,
  UserRole,
  UtilityType,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from "./domain";

export interface HealthResponse {
  status: "ok";
  service: string;
  dependencies?: {
    api: { status: "ok" };
    postgres: { status: "ok" | "degraded" };
    redis: { status: "ok" | "degraded" };
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    method?: string;
    path?: string;
    statusCode?: number;
    timestamp?: ISODateTime;
  };
}

export interface PageRequest {
  cursor?: string;
  limit?: number;
}

export interface PageResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface CurrentUserResponse {
  membership: Membership;
  organization: Organization;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
  token: string;
}

export interface SuccessResponse {
  success: true;
}

export interface InvitationPreviewResponse {
  invitation: {
    email: string;
    organizationName: string;
    role: UserRole;
    status: "pending" | "accepted" | "revoked" | "expired";
  };
}

export interface CreateInvitationRequest {
  email: string;
  role: UserRole;
}

export interface AcceptInvitationRequest {
  name: string;
  password: string;
  token: string;
}

export interface UpdateMembershipRequest {
  role?: UserRole;
}

export interface CreateBuildingRequest {
  name: string;
  address?: string;
  timezone: string;
}

export interface UpdateBuildingRequest {
  name?: string;
  address?: string;
  timezone?: string;
}

export interface ListBuildingsQuery extends PageRequest {
  search?: string;
}

export interface BuildingDetailResponse extends Building {
  building: Building;
  floors: Floor[];
  meters: Meter[];
  units: Unit[];
}

export type BuildingResponse = Building | BuildingDetailResponse;

export interface CreateUnitRequest {
  buildingId: EntityId;
  floorId?: EntityId;
  name: string;
  occupancyStatus?: Unit["occupancyStatus"];
}

export interface UpdateUnitRequest {
  floorId?: EntityId;
  name?: string;
  occupancyStatus?: Unit["occupancyStatus"];
}

export interface ListUnitsQuery extends PageRequest {
  buildingId?: EntityId;
  floorId?: EntityId;
}

export type UnitResponse = Unit;
export type FloorResponse = Floor;

export interface CreateFloorRequest {
  buildingId: EntityId;
  name: string;
  level: number;
}

export interface UpdateFloorRequest {
  name?: string;
  level?: number;
}

export interface CreateMeterRequest {
  buildingId: EntityId;
  floorId?: EntityId;
  unitId?: EntityId;
  utilityType: UtilityType;
  source: MeterSource;
  externalId: string;
  installedAt?: ISODateTime;
}

export interface UpdateMeterRequest {
  floorId?: EntityId;
  unitId?: EntityId;
  status?: MeterStatus;
  installedAt?: ISODateTime;
}

export interface ListMetersQuery extends PageRequest {
  buildingId?: EntityId;
  unitId?: EntityId;
  status?: MeterStatus;
  utilityType?: UtilityType;
}

export interface MeterResponse extends Meter {
  supportedReadingUnits: ReadingUnit[];
}

export interface IngestReadingRequest {
  meterExternalId: string;
  measuredAt: ISODateTime;
  utilityType: UtilityType;
  value: number;
  unit: ReadingUnit;
  readingKind: ReadingKind;
}

export interface IngestReadingResponse {
  reading: MeterReading;
  accepted: boolean;
  duplicate: boolean;
}

export interface ListReadingsQuery extends PageRequest {
  from?: ISODateTime;
  to?: ISODateTime;
}

export type ReadingResponse = MeterReading;

export const simulationScenarios = [
  "normal",
  "leak",
  "spike",
  "offline",
] as const;
export type SimulationScenario = (typeof simulationScenarios)[number];

export interface RunSimulationRequest {
  intervalMinutes?: number;
  intervals?: number;
  meterExternalIds?: string[];
  offlineMeterExternalIds?: string[];
  scenario?: SimulationScenario;
  seed?: string;
  startAt?: ISODateTime;
}

export interface SimulationMeterResult {
  acceptedCount: number;
  duplicateCount: number;
  externalId: string;
  generatedCount: number;
  meterId: EntityId;
  skipped: boolean;
  utilityType: UtilityType;
}

export interface RunSimulationResponse {
  acceptedCount: number;
  duplicateCount: number;
  generatedCount: number;
  meters: SimulationMeterResult[];
  skippedCount: number;
}

export interface DemoSeedResponse {
  acceptedReadingCount: number;
  aggregateCount: number;
  alertEventCount?: number;
  alertRuleCount?: number;
  buildingCount: number;
  duplicateReadingCount: number;
  floorCount?: number;
  meterCount: number;
  reportMonth: string;
  unitCount: number;
}

export interface UtilityRatesResponse {
  electricPerKwh: number;
  organizationId: EntityId;
  updatedAt?: ISODateTime;
  waterPerGallon: number;
}

export interface UpdateUtilityRatesRequest {
  electricPerKwh?: number;
  waterPerGallon?: number;
}

export interface ListUsageQuery extends PageRequest {
  buildingId?: EntityId;
  unitId?: EntityId;
  meterId?: EntityId;
  utilityType?: UtilityType;
  from?: ISODateTime;
  to?: ISODateTime;
}

export type UsageAggregateResponse = UsageAggregate;

export type AlertRuleResponse = AlertRule;
export type AlertEventResponse = AlertEvent;

export interface ListAlertsQuery extends PageRequest {
  status?: AlertStatus;
  severity?: AlertSeverity;
}

export interface CreateManualLeakIncidentRequest {
  buildingId: EntityId;
  unitId?: EntityId;
  meterId?: EntityId;
  severity: AlertSeverity;
  title: string;
  description: string;
}

export interface ListLeakIncidentsQuery extends PageRequest {
  buildingId?: EntityId;
  source?: LeakIncidentSource;
}

export type LeakIncidentResponse = LeakIncident;

export interface LeakIncidentDetailResponse extends LeakIncident {
  activities: IncidentActivity[];
  evidence: IncidentEvidence[];
  workOrders: WorkOrder[];
}

export interface CreateIncidentNoteRequest {
  note: string;
}

export interface CreateWorkOrderRequest {
  assignedMembershipId?: EntityId;
  description: string;
  dueAt?: ISODateTime;
  priority: WorkOrderPriority;
  title: string;
}

export interface UpdateWorkOrderRequest {
  assignedMembershipId?: EntityId;
  completionNote?: string;
  description?: string;
  dueAt?: ISODateTime;
  priority?: WorkOrderPriority;
  status?: WorkOrderStatus;
  title?: string;
}

export interface ListWorkOrdersQuery extends PageRequest {
  assignedMembershipId?: EntityId;
  incidentId?: EntityId;
  overdue?: boolean;
  priority?: WorkOrderPriority;
  status?: WorkOrderStatus;
}

export interface WorkOrderResponse extends WorkOrder {
  isOverdue: boolean;
}

export interface ResolveLeakIncidentRequest {
  resolutionCategory: LeakIncidentResolutionCategory;
  resolutionNote?: string;
}

export type IncidentResponderSettingsResponse = IncidentResponderSettings;

export interface UpdateIncidentResponderSettingsRequest {
  emailEnabled?: boolean;
  criticalAcknowledgementDeadlineMinutes?: number;
  warningAcknowledgementDeadlineMinutes?: number;
}

export type IncidentNotificationResponse = IncidentNotification;

export interface CreateLeakDetectionPolicyRequest {
  name: string;
  scopeType: AlertScopeType;
  scopeId?: EntityId;
  minimumIntervalUsage: number;
  minimumConsecutiveIntervals: number;
  maximumIntervalGapMinutes: number;
  severity: AlertSeverity;
  enabled?: boolean;
}

export type LeakDetectionPolicyResponse = LeakDetectionPolicy;

export interface CreateAlertRuleRequest {
  name: string;
  utilityType?: UtilityType;
  scopeType: AlertRule["scopeType"];
  scopeId?: EntityId;
  conditionType: AlertRule["conditionType"];
  threshold?: number;
  windowMinutes: number;
  enabled?: boolean;
}

export interface UpdateAlertRuleRequest {
  name?: string;
  threshold?: number;
  windowMinutes?: number;
  enabled?: boolean;
}

export const reportTypes = [
  "usage_summary",
  "billing_export",
  "device_health",
  "alerts",
] as const;
export type ReportType = (typeof reportTypes)[number];

export const reportFormats = ["csv", "pdf", "json"] as const;
export type ReportFormat = (typeof reportFormats)[number];

export interface CreateReportRequest {
  reportType: ReportType;
  format: ReportFormat;
  from: ISODateTime;
  to: ISODateTime;
  buildingId?: EntityId;
  unitId?: EntityId;
  utilityType?: UtilityType;
}

export interface ReportResponse {
  id: EntityId;
  organizationId: EntityId;
  reportType: ReportType;
  format: ReportFormat;
  status: "queued" | "running" | "completed" | "failed";
  downloadUrl?: string;
  createdAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface ListReportsQuery extends PageRequest {
  reportType?: ReportType;
  status?: ReportResponse["status"];
}

export interface MonthlyUsageReportQuery {
  buildingId?: EntityId;
  month: string;
  unitId?: EntityId;
}

export interface MonthlyUsageReportColumn {
  key:
    | "buildingName"
    | "unitName"
    | "waterGallons"
    | "electricKwh"
    | "estimatedCost";
  label: string;
}

export interface MonthlyUsageReportRow {
  buildingId: EntityId;
  buildingName: string;
  electricKwh: number;
  estimatedCost: number;
  unitId?: EntityId;
  unitName: string;
  waterGallons: number;
}

export interface MonthlyUsageReportResponse {
  columns: MonthlyUsageReportColumn[];
  format: "json";
  generatedAt: ISODateTime;
  id: EntityId;
  organizationId: EntityId;
  periodEnd: ISODateTime;
  periodStart: ISODateTime;
  reportType: "usage_summary";
  rows: MonthlyUsageReportRow[];
  totals: {
    electricKwh: number;
    estimatedCost: number;
    waterGallons: number;
  };
}
