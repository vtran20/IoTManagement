import type {
  AlertEvent,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  Building,
  Floor,
  Membership,
  Meter,
  MeterReading,
  ReadingKind,
  ReadingQuality,
  ReadingUnit,
  Unit,
  User,
  UserRole,
  UsageAggregate,
  UtilityType,
} from "@iot-management/types";
import type { StoredUser } from "./in-memory-persistence.service";

export const PERSISTENCE_SERVICE = Symbol("PERSISTENCE_SERVICE");

export type MaybePromise<T> = T | Promise<T>;

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
    htmlBody?: string;
    subject: string;
    textBody: string;
    to: string;
  }): MaybePromise<StoredEmailOutboxItem>;
  listEmailOutboxItems(): MaybePromise<StoredEmailOutboxItem[]>;

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
    input: Partial<Pick<Building, "address" | "name" | "timezone">>,
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
    input: Partial<Pick<Floor, "level" | "name">>,
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
    input: Partial<Pick<Unit, "floorId" | "name" | "occupancyStatus">>,
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
        "floorId" | "installedAt" | "lastReadingAt" | "status" | "unitId"
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
  updateAlertEvent(
    organizationId: string,
    alertId: string,
    input: Partial<
      Pick<AlertEvent, "acknowledgedAt" | "resolvedAt" | "status">
    >,
  ): MaybePromise<AlertEvent | undefined>;
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
