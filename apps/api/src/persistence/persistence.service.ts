import type {
  AlertEvent,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  Building,
  Floor,
  IncidentActivity,
  IncidentEvidence,
  IncidentCorrelationSettings,
  LeakBaselineSettings,
  IncidentNotification,
  OperationsNotification,
  IncidentResponderSettings,
  IncidentSensorEvidence,
  LeakIncident,
  LeakDetectionPolicy,
  Membership,
  Meter,
  MeterReading,
  MoistureSensor,
  MoistureSensorEvent,
  ReadingKind,
  ReadingQuality,
  ReadingUnit,
  Unit,
  User,
  UserRole,
  UsageAggregate,
  UtilityRatesResponse,
  UtilityType,
  WorkOrder,
  WorkOrderNote,
  WorkOrderNotification,
  Vendor,
} from "@iot-management/types";
import type { StoredUser } from "./in-memory-persistence.service";

export const PERSISTENCE_SERVICE = Symbol("PERSISTENCE_SERVICE");

export type MaybePromise<T> = T | Promise<T>;

export interface StoredAuditLog {
  action: string;
  actorUserId?: string;
  createdAt: string;
  id: string;
  metadata: Record<string, unknown>;
  organizationId: string;
  targetId: string;
  targetType: string;
}

export interface DashboardAggregateQuery {
  buildingId?: string;
  from?: string;
  limit?: number;
  organizationId: string;
  periodType: UsageAggregate["periodType"];
  to?: string;
  utilityType?: UtilityType;
}

export interface DashboardTrendAggregate {
  costEstimate: number;
  periodEnd: string;
  periodStart: string;
  usageValue: number;
  usageWithoutCostEstimate: number;
  utilityType: UtilityType;
}

export interface DashboardBuildingAggregate {
  buildingId: string;
  buildingName: string;
  costEstimate: number;
  usageValue: number;
  usageWithoutCostEstimate: number;
  utilityType: UtilityType;
}

export interface DashboardUnitAggregate {
  buildingId: string;
  buildingName: string;
  unitId: string;
  unitName: string;
  usageValue: number;
  utilityType: UtilityType;
}

export interface PersistenceService {
  findUserByEmail(email: string): MaybePromise<StoredUser | undefined>;
  findUserById(userId: string): MaybePromise<StoredUser | undefined>;
  updateUserPasswordHash(
    userId: string,
    passwordHash: string,
  ): MaybePromise<StoredUser | undefined>;
  findPrimaryMembershipForUser(
    userId: string,
  ): MaybePromise<Membership | undefined>;
  findMembershipById(
    membershipId: string,
  ): MaybePromise<Membership | undefined>;
  findOrganizationById(
    organizationId: string,
  ): MaybePromise<UserOrganization | undefined>;
  createMembershipForCurrentOrganization(input: {
    email: string;
    organizationId: string;
    role: UserRole;
  }): MaybePromise<Membership>;
  listMemberships(organizationId: string): MaybePromise<Membership[]>;
  findMembershipByOrganizationAndId(
    organizationId: string,
    membershipId: string,
  ): MaybePromise<Membership | undefined>;
  findMembershipByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): MaybePromise<Membership | undefined>;
  updateMembershipRole(
    organizationId: string,
    membershipId: string,
    role: UserRole,
  ): MaybePromise<Membership | undefined>;
  updateMembershipStatus(
    organizationId: string,
    membershipId: string,
    status: "active" | "disabled",
  ): MaybePromise<Membership | undefined>;
  countActiveOwners(organizationId: string): MaybePromise<number>;
  createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): MaybePromise<StoredUser>;
  createInvitation(input: {
    email: string;
    expiresAt: string;
    inviterUserId: string;
    organizationId: string;
    role: UserRole;
    tokenHash: string;
  }): MaybePromise<StoredInvitation>;
  findInvitationByTokenHash(
    tokenHash: string,
  ): MaybePromise<StoredInvitation | undefined>;
  markInvitationAccepted(
    invitationId: string,
    acceptedAt: string,
  ): MaybePromise<void>;
  createAuditLog(input: {
    action: string;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
    organizationId: string;
    targetId: string;
    targetType: string;
  }): MaybePromise<void>;
  listAuditLogs(input: {
    action?: string;
    limit?: number;
    organizationId: string;
    targetType?: string;
  }): MaybePromise<StoredAuditLog[]>;
  createSession(input: {
    expiresAt: string;
    ipAddress?: string;
    membershipId: string;
    organizationId: string;
    tokenHash: string;
    userAgent?: string;
    userId: string;
  }): MaybePromise<StoredSession>;
  findActiveSessionByTokenHash(
    tokenHash: string,
    now: string,
  ): MaybePromise<StoredSession | undefined>;
  revokeSession(sessionId: string, revokedAt: string): MaybePromise<void>;
  createPasswordResetToken(input: {
    expiresAt: string;
    requestedIp?: string;
    tokenHash: string;
    userAgent?: string;
    userId: string;
  }): MaybePromise<StoredPasswordResetToken>;
  findActivePasswordResetTokenByHash(
    tokenHash: string,
    now: string,
  ): MaybePromise<StoredPasswordResetToken | undefined>;
  markPasswordResetTokenUsed(
    tokenId: string,
    usedAt: string,
  ): MaybePromise<void>;
  createEmailOutboxItem(input: {
    dedupeKey?: string;
    htmlBody?: string;
    subject: string;
    textBody: string;
    to: string;
  }): MaybePromise<StoredEmailOutboxItem>;
  listEmailOutboxItems(): MaybePromise<StoredEmailOutboxItem[]>;

  getUtilityRates(organizationId: string): MaybePromise<UtilityRatesResponse>;
  upsertUtilityRates(input: {
    electricPerKwh: number;
    organizationId: string;
    waterPerGallon: number;
  }): MaybePromise<UtilityRatesResponse>;

  listBuildings(organizationId: string): MaybePromise<Building[]>;
  createBuilding(input: {
    address?: string;
    name: string;
    organizationId: string;
    timezone: string;
  }): MaybePromise<Building>;
  findBuildingById(
    organizationId: string,
    buildingId: string,
  ): MaybePromise<Building | undefined>;
  updateBuilding(
    organizationId: string,
    buildingId: string,
    input: Partial<
      Pick<
        Building,
        "address" | "archivedAt" | "lifecycleStatus" | "name" | "timezone"
      >
    >,
  ): MaybePromise<Building | undefined>;

  listFloors(
    organizationId: string,
    buildingId?: string,
  ): MaybePromise<Floor[]>;
  createFloor(input: {
    buildingId: string;
    level: number;
    name: string;
    organizationId: string;
  }): MaybePromise<Floor>;
  findFloorById(
    organizationId: string,
    floorId: string,
  ): MaybePromise<Floor | undefined>;
  updateFloor(
    organizationId: string,
    floorId: string,
    input: Partial<
      Pick<Floor, "archivedAt" | "level" | "lifecycleStatus" | "name">
    >,
  ): MaybePromise<Floor | undefined>;

  listUnits(input: {
    buildingId?: string;
    floorId?: string;
    organizationId: string;
  }): MaybePromise<Unit[]>;
  createUnit(input: {
    buildingId: string;
    floorId?: string;
    name: string;
    occupancyStatus: Unit["occupancyStatus"];
    organizationId: string;
  }): MaybePromise<Unit>;
  findUnitById(
    organizationId: string,
    unitId: string,
  ): MaybePromise<Unit | undefined>;
  updateUnit(
    organizationId: string,
    unitId: string,
    input: Partial<
      Pick<
        Unit,
        | "archivedAt"
        | "floorId"
        | "lifecycleStatus"
        | "name"
        | "occupancyStatus"
      >
    >,
  ): MaybePromise<Unit | undefined>;

  listMeters(input: {
    buildingId?: string;
    organizationId: string;
    status?: Meter["status"];
    unitId?: string;
    utilityType?: Meter["utilityType"];
  }): MaybePromise<Meter[]>;
  findMeterById(
    organizationId: string,
    meterId: string,
  ): MaybePromise<Meter | undefined>;
  findMeterByExternalId(
    organizationId: string,
    externalId: string,
  ): MaybePromise<Meter | undefined>;
  createMeter(
    input: Omit<Meter, "id" | "status"> & { status?: Meter["status"] },
  ): MaybePromise<Meter>;
  updateMeter(
    organizationId: string,
    meterId: string,
    input: Partial<
      Pick<
        Meter,
        | "archivedAt"
        | "floorId"
        | "installedAt"
        | "lastReadingAt"
        | "lifecycleStatus"
        | "status"
        | "unitId"
      >
    >,
  ): MaybePromise<Meter | undefined>;

  findReadingByMeterAndMeasuredAt(
    organizationId: string,
    meterId: string,
    measuredAt: string,
  ): MaybePromise<MeterReading | undefined>;
  createReading(input: {
    measuredAt: string;
    meterId: string;
    organizationId: string;
    quality?: ReadingQuality;
    readingKind: ReadingKind;
    receivedAt: string;
    unit: ReadingUnit;
    utilityType: UtilityType;
    value: number;
  }): MaybePromise<MeterReading>;
  listReadings(input: {
    from?: string;
    meterId: string;
    organizationId: string;
    to?: string;
  }): MaybePromise<MeterReading[]>;

  createUsageAggregate(
    input: Omit<UsageAggregate, "costEstimate" | "id"> & {
      costEstimate?: number;
    },
  ): MaybePromise<UsageAggregate>;
  replaceUsageAggregates(input: {
    aggregates: Array<Omit<UsageAggregate, "id">>;
    organizationId: string;
    periodType: UsageAggregate["periodType"];
  }): MaybePromise<UsageAggregate[]>;
  listUsageAggregates(input: {
    buildingId?: string;
    from?: string;
    meterId?: string;
    organizationId: string;
    periodType?: UsageAggregate["periodType"];
    to?: string;
    unitId?: string;
    utilityType?: UtilityType;
  }): MaybePromise<UsageAggregate[]>;

  createLeakDetectionPolicy(
    input: Omit<LeakDetectionPolicy, "enabled" | "id"> & { enabled?: boolean },
  ): MaybePromise<LeakDetectionPolicy>;
  listLeakDetectionPolicies(input: {
    organizationId: string;
  }): MaybePromise<LeakDetectionPolicy[]>;

  createLeakIncident(input: {
    buildingId: string;
    description: string;
    detectedAt: string;
    meterId?: string;
    organizationId: string;
    severity: LeakIncident["severity"];
    source: LeakIncident["source"];
    title: string;
    unitId?: string;
    estimatedExcessWater?: number;
    estimatedExcessCost?: number;
  }): MaybePromise<LeakIncident>;
  listLeakIncidents(input: {
    buildingId?: string;
    organizationId: string;
    source?: LeakIncident["source"];
  }): MaybePromise<LeakIncident[]>;
  findOpenLeakIncidentForPolicyMeter(input: {
    meterId: string;
    organizationId: string;
    policyId: string;
  }): MaybePromise<LeakIncident | undefined>;
  createIncidentEvidence(input: {
    createdAt: string;
    incidentId: string;
    meterId: string;
    observedUsage: number;
    organizationId: string;
    policyId?: string;
    readingIds: string[];
    thresholdUsage: number;
    windowEndedAt: string;
    windowStartedAt: string;
  }): MaybePromise<IncidentEvidence>;
  listIncidentEvidence(input: {
    incidentId: string;
    organizationId: string;
  }): MaybePromise<IncidentEvidence[]>;
  createMoistureSensor(
    input: Omit<MoistureSensor, "id">,
  ): MaybePromise<MoistureSensor>;
  listMoistureSensors(input: {
    buildingId?: string;
    organizationId: string;
  }): MaybePromise<MoistureSensor[]>;
  findMoistureSensorById(
    organizationId: string,
    sensorId: string,
  ): MaybePromise<MoistureSensor | undefined>;
  findMoistureSensorByExternalId(
    organizationId: string,
    externalId: string,
  ): MaybePromise<MoistureSensor | undefined>;
  updateMoistureSensor(
    organizationId: string,
    sensorId: string,
    input: Partial<Pick<MoistureSensor, "name" | "status" | "updatedAt">>,
  ): MaybePromise<MoistureSensor | undefined>;
  createMoistureSensorEvent(
    input: Omit<MoistureSensorEvent, "id">,
  ): MaybePromise<{
    created: boolean;
    event: MoistureSensorEvent;
  }>;
  listMoistureSensorEvents(input: {
    organizationId: string;
    sensorId: string;
  }): MaybePromise<MoistureSensorEvent[]>;
  createIncidentSensorEvidence(input: {
    createdAt: string;
    incidentId: string;
    organizationId: string;
    sensorEventId: string;
    sensorId: string;
  }): MaybePromise<IncidentSensorEvidence>;
  listIncidentSensorEvidence(input: {
    incidentId: string;
    organizationId: string;
  }): MaybePromise<IncidentSensorEvidence[]>;
  findIncidentSensorEvidenceByEvent(
    organizationId: string,
    sensorEventId: string,
  ): MaybePromise<IncidentSensorEvidence | undefined>;
  getIncidentCorrelationSettings(
    organizationId: string,
  ): MaybePromise<IncidentCorrelationSettings>;
  upsertIncidentCorrelationSettings(
    input: IncidentCorrelationSettings,
  ): MaybePromise<IncidentCorrelationSettings>;
  getLeakBaselineSettings(
    organizationId: string,
  ): MaybePromise<LeakBaselineSettings>;
  upsertLeakBaselineSettings(
    input: LeakBaselineSettings,
  ): MaybePromise<LeakBaselineSettings>;
  findLeakIncidentById(
    organizationId: string,
    incidentId: string,
  ): MaybePromise<LeakIncident | undefined>;
  updateLeakIncident(
    organizationId: string,
    incidentId: string,
    input: Partial<
      Pick<
        LeakIncident,
        | "acknowledgedAt"
        | "containedAt"
        | "investigatingAt"
        | "monitoringAt"
        | "resolutionCategory"
        | "resolutionNote"
        | "resolvedAt"
        | "status"
      >
    >,
  ): MaybePromise<LeakIncident | undefined>;
  createIncidentActivity(input: {
    actorUserId?: string;
    createdAt: string;
    incidentId: string;
    organizationId: string;
    summary: string;
    type: IncidentActivity["type"];
  }): MaybePromise<IncidentActivity>;
  listIncidentActivities(input: {
    incidentId: string;
    organizationId: string;
  }): MaybePromise<IncidentActivity[]>;
  getIncidentResponderSettings(
    organizationId: string,
  ): MaybePromise<IncidentResponderSettings>;
  upsertIncidentResponderSettings(input: {
    criticalAcknowledgementDeadlineMinutes: number;
    emailEnabled: boolean;
    organizationId: string;
    updatedAt: string;
    warningAcknowledgementDeadlineMinutes: number;
  }): MaybePromise<IncidentResponderSettings>;
  createIncidentNotification(input: {
    channel: IncidentNotification["channel"];
    createdAt: string;
    dedupeKey: string;
    emailOutboxId?: string;
    incidentId: string;
    kind: IncidentNotification["kind"];
    organizationId: string;
    recipientMembershipId: string;
    status: IncidentNotification["status"];
  }): MaybePromise<{ created: boolean; notification: IncidentNotification }>;
  listIncidentNotifications(input: {
    organizationId: string;
    recipientMembershipId: string;
  }): MaybePromise<IncidentNotification[]>;
  markIncidentNotificationRead(input: {
    notificationId: string;
    readAt: string;
    recipientMembershipId: string;
    organizationId: string;
  }): MaybePromise<IncidentNotification | undefined>;
  createWorkOrderNotification(
    input: Omit<WorkOrderNotification, "id" | "readAt">,
  ): MaybePromise<{ created: boolean; notification: WorkOrderNotification }>;
  listWorkOrderNotifications(input: {
    organizationId: string;
    recipientMembershipId: string;
  }): MaybePromise<WorkOrderNotification[]>;
  markWorkOrderNotificationRead(input: {
    notificationId: string;
    organizationId: string;
    recipientMembershipId: string;
    readAt: string;
  }): MaybePromise<WorkOrderNotification | undefined>;
  createVendor(input: Omit<Vendor, "id">): MaybePromise<Vendor>;
  listVendors(input: {
    organizationId: string;
    status?: Vendor["status"];
  }): MaybePromise<Vendor[]>;
  findVendorById(
    organizationId: string,
    vendorId: string,
  ): MaybePromise<Vendor | undefined>;
  updateVendor(
    organizationId: string,
    vendorId: string,
    input: Partial<
      Pick<
        Vendor,
        | "companyName"
        | "contactName"
        | "email"
        | "phone"
        | "status"
        | "trade"
        | "updatedAt"
      >
    >,
  ): MaybePromise<Vendor | undefined>;
  createWorkOrder(input: {
    assignedMembershipId?: string;
    assignedVendorId?: string;
    buildingId: string;
    createdAt: string;
    description: string;
    dueAt?: string;
    estimatedCost?: number;
    incidentId: string;
    organizationId: string;
    priority: WorkOrder["priority"];
    status: WorkOrder["status"];
    title: string;
    unitId?: string;
    updatedAt: string;
  }): MaybePromise<WorkOrder>;
  listWorkOrders(input: {
    assignedMembershipId?: string;
    assignedVendorId?: string;
    incidentId?: string;
    organizationId: string;
    overdue?: boolean;
    priority?: WorkOrder["priority"];
    status?: WorkOrder["status"];
  }): MaybePromise<WorkOrder[]>;
  findWorkOrderById(
    organizationId: string,
    workOrderId: string,
  ): MaybePromise<WorkOrder | undefined>;
  updateWorkOrder(
    organizationId: string,
    workOrderId: string,
    input: Partial<
      Pick<
        WorkOrder,
        | "completedAt"
        | "completionNote"
        | "description"
        | "dueAt"
        | "estimatedCost"
        | "finalCost"
        | "priority"
        | "status"
        | "title"
        | "updatedAt"
      >
    > & {
      assignedMembershipId?: string | null;
      assignedVendorId?: string | null;
    },
  ): MaybePromise<WorkOrder | undefined>;
  createWorkOrderNote(
    input: Omit<WorkOrderNote, "id">,
  ): MaybePromise<WorkOrderNote>;
  listWorkOrderNotes(input: {
    organizationId: string;
    workOrderId: string;
  }): MaybePromise<WorkOrderNote[]>;
  listDashboardTrendAggregates(
    input: DashboardAggregateQuery,
  ): MaybePromise<DashboardTrendAggregate[]>;
  listDashboardBuildingAggregates(
    input: DashboardAggregateQuery,
  ): MaybePromise<DashboardBuildingAggregate[]>;
  listDashboardUnitAggregates(
    input: DashboardAggregateQuery,
  ): MaybePromise<DashboardUnitAggregate[]>;

  createAlertRule(
    input: Omit<AlertRule, "enabled" | "id"> & {
      enabled?: boolean;
    },
  ): MaybePromise<AlertRule>;
  listAlertRules(input: { organizationId: string }): MaybePromise<AlertRule[]>;
  findAlertRuleById(
    organizationId: string,
    ruleId: string,
  ): MaybePromise<AlertRule | undefined>;
  updateAlertRule(
    organizationId: string,
    ruleId: string,
    input: Partial<
      Pick<
        AlertRule,
        | "enabled"
        | "name"
        | "scopeId"
        | "threshold"
        | "utilityType"
        | "windowMinutes"
      >
    >,
  ): MaybePromise<AlertRule | undefined>;

  createAlertEvent(input: {
    message: string;
    organizationId: string;
    ruleId?: string;
    severity: AlertSeverity;
    title: string;
    triggeredAt: string;
  }): MaybePromise<AlertEvent>;
  listAlertEvents(input: {
    incidentId?: string;
    organizationId: string;
    severity?: AlertSeverity;
    status?: AlertStatus;
  }): MaybePromise<AlertEvent[]>;
  findAlertEventById(
    organizationId: string,
    alertId: string,
  ): MaybePromise<AlertEvent | undefined>;
  findOpenAlertForRule(
    organizationId: string,
    ruleId: string,
  ): MaybePromise<AlertEvent | undefined>;
  linkAlertToIncident(input: {
    alertId: string;
    incidentId: string;
    organizationId: string;
  }): MaybePromise<AlertEvent | undefined>;
  createManualIncidentFromAlert(input: {
    actorUserId: string;
    alertId: string;
    buildingId: string;
    description: string;
    detectedAt: string;
    organizationId: string;
    severity: AlertSeverity;
    title: string;
    unitId?: string;
    meterId?: string;
  }): MaybePromise<{ alert: AlertEvent; incident: LeakIncident } | undefined>;
  updateAlertEvent(
    organizationId: string,
    alertId: string,
    input: Partial<
      Pick<AlertEvent, "acknowledgedAt" | "resolvedAt" | "status">
    >,
  ): MaybePromise<AlertEvent | undefined>;

  resetDemoData(organizationId: string): MaybePromise<void>;
}

export type UserOrganization = import("@iot-management/types").Organization;

export interface StoredSession {
  id: string;
  tokenHash: string;
  userId: string;
  organizationId: string;
  membershipId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface StoredPasswordResetToken {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  requestedIp?: string;
  userAgent?: string;
}

export interface StoredEmailOutboxItem {
  id: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  status: "queued" | "sent" | "failed";
  createdAt: string;
  dedupeKey?: string;
  sentAt?: string;
}

export interface StoredInvitation {
  id: string;
  tokenHash: string;
  organizationId: string;
  inviterUserId: string;
  email: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  revokedAt?: string;
}
