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
  Organization,
  ReadingKind,
  ReadingQuality,
  ReadingUnit,
  Unit,
  User,
  UserRole,
  UsageAggregate,
  UtilityRatesResponse,
  UtilityType,
} from "@iot-management/types";
import { Injectable } from "@nestjs/common";
import { createPasswordHash } from "../auth/password";
import type {
  PersistenceService,
  StoredEmailOutboxItem,
  StoredInvitation,
  StoredPasswordResetToken,
  StoredSession,
} from "./persistence.service";

export interface StoredUser extends User {
  passwordHash: string;
}

@Injectable()
export class InMemoryPersistenceService implements PersistenceService {
  private counters = {
    building: 1,
    alertEvent: 1,
    alertRule: 1,
    emailOutbox: 1,
    floor: 1,
    invitation: 1,
    meter: 1,
    passwordResetToken: 1,
    reading: 1,
    session: 1,
    usageAggregate: 1,
    unit: 1,
  };

  private readonly organizations: Organization[] = [
    {
      id: "org_north",
      name: "North Properties",
      status: "active",
      createdAt: "2026-06-29T00:00:00.000Z",
    },
    {
      id: "org_south",
      name: "South Properties",
      status: "active",
      createdAt: "2026-06-29T00:00:00.000Z",
    },
  ];

  private readonly utilityRates = new Map<string, UtilityRatesResponse>();

  private readonly users: StoredUser[] = [
    this.createBootstrapUser(
      "user_north_owner",
      "owner@north.example",
      "North Owner",
    ),
    this.createBootstrapUser(
      "user_north_manager",
      "manager@north.example",
      "North Manager",
    ),
    this.createBootstrapUser(
      "user_north_viewer",
      "viewer@north.example",
      "North Viewer",
    ),
    this.createBootstrapUser(
      "user_south_owner",
      "owner@south.example",
      "South Owner",
    ),
  ];

  private readonly memberships: Membership[] = [
    this.createMembership(
      "membership_north_owner",
      "org_north",
      "user_north_owner",
      "owner",
    ),
    this.createMembership(
      "membership_north_manager",
      "org_north",
      "user_north_manager",
      "manager",
    ),
    this.createMembership(
      "membership_north_viewer",
      "org_north",
      "user_north_viewer",
      "viewer",
    ),
    this.createMembership(
      "membership_south_owner",
      "org_south",
      "user_south_owner",
      "owner",
    ),
  ];

  private readonly buildings: Building[] = [
    {
      id: "building_south",
      organizationId: "org_south",
      name: "South Tower",
      address: "200 South St",
      timezone: "America/Detroit",
      lifecycleStatus: "active",
    },
  ];

  private readonly floors: Floor[] = [
    {
      id: "floor_south_1",
      organizationId: "org_south",
      buildingId: "building_south",
      name: "Level 1",
      level: 1,
      lifecycleStatus: "active",
    },
  ];

  private readonly units: Unit[] = [
    {
      id: "unit_south_101",
      organizationId: "org_south",
      buildingId: "building_south",
      floorId: "floor_south_1",
      name: "101",
      occupancyStatus: "occupied",
      lifecycleStatus: "active",
    },
  ];

  private readonly meters: Meter[] = [];
  private readonly readings: MeterReading[] = [];
  private readonly usageAggregates: UsageAggregate[] = [];
  private readonly alertRules: AlertRule[] = [];
  private readonly alertEvents: AlertEvent[] = [];
  private readonly sessions: StoredSession[] = [];
  private readonly passwordResetTokens: StoredPasswordResetToken[] = [];
  private readonly emailOutboxItems: StoredEmailOutboxItem[] = [];
  private readonly invitations: StoredInvitation[] = [];

  findUserByEmail(email: string): StoredUser | undefined {
    return this.users.find((user) => user.email === email.toLowerCase());
  }

  findUserById(userId: string): StoredUser | undefined {
    return this.users.find((user) => user.id === userId);
  }

  updateUserPasswordHash(
    userId: string,
    passwordHash: string,
  ): StoredUser | undefined {
    const user = this.users.find((candidate) => candidate.id === userId);
    if (!user) {
      return undefined;
    }
    user.passwordHash = passwordHash;
    return user;
  }

  createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): StoredUser {
    const email = input.email.toLowerCase();
    const existing = this.findUserByEmail(email);
    if (existing) {
      existing.name = input.name;
      existing.passwordHash = input.passwordHash;
      return existing;
    }
    const user: StoredUser = {
      id: `user_${email.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`,
      email,
      name: input.name,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  findPrimaryMembershipForUser(userId: string): Membership | undefined {
    return this.memberships.find((membership) => membership.userId === userId);
  }

  findMembershipById(membershipId: string): Membership | undefined {
    return this.memberships.find(
      (membership) => membership.id === membershipId,
    );
  }

  findOrganizationById(organizationId: string): Organization | undefined {
    return this.organizations.find(
      (organization) => organization.id === organizationId,
    );
  }

  createMembershipForCurrentOrganization(input: {
    email: string;
    organizationId: string;
    role: UserRole;
  }): Membership {
    const userId = `user_${input.email.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
    let user = this.findUserByEmail(input.email);
    if (!user) {
      user = this.createBootstrapUser(userId, input.email, input.email);
      this.users.push(user);
    }

    const existing = this.findMembershipByOrganizationAndUser(
      input.organizationId,
      user.id,
    );
    if (existing) {
      existing.role = input.role;
      existing.status = "active";
      return existing;
    }

    const membership = this.createMembership(
      `membership_${userId}_${input.organizationId}`,
      input.organizationId,
      user.id,
      input.role,
    );
    this.memberships.push(membership);
    return membership;
  }

  listMemberships(organizationId: string): Membership[] {
    return this.memberships.filter(
      (membership) => membership.organizationId === organizationId,
    );
  }

  findMembershipByOrganizationAndId(
    organizationId: string,
    membershipId: string,
  ): Membership | undefined {
    return this.memberships.find(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.id === membershipId,
    );
  }

  findMembershipByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Membership | undefined {
    return this.memberships.find(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.userId === userId,
    );
  }

  updateMembershipRole(
    organizationId: string,
    membershipId: string,
    role: UserRole,
  ): Membership | undefined {
    const membership = this.findMembershipByOrganizationAndId(
      organizationId,
      membershipId,
    );
    if (membership) {
      membership.role = role;
    }
    return membership;
  }

  updateMembershipStatus(
    organizationId: string,
    membershipId: string,
    status: "active" | "disabled",
  ): Membership | undefined {
    const membership = this.findMembershipByOrganizationAndId(
      organizationId,
      membershipId,
    );
    if (membership) {
      membership.status = status;
    }
    return membership;
  }

  countActiveOwners(organizationId: string): number {
    return this.memberships.filter(
      (membership) =>
        membership.organizationId === organizationId &&
        membership.role === "owner" &&
        (membership.status ?? "active") === "active",
    ).length;
  }

  createSession(input: {
    expiresAt: string;
    ipAddress?: string;
    membershipId: string;
    organizationId: string;
    tokenHash: string;
    userAgent?: string;
    userId: string;
  }): StoredSession {
    const session: StoredSession = {
      id: this.nextId("session", input.userId),
      tokenHash: input.tokenHash,
      userId: input.userId,
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    };
    this.sessions.push(session);
    return session;
  }

  findActiveSessionByTokenHash(
    tokenHash: string,
    now: string,
  ): StoredSession | undefined {
    return this.sessions.find(
      (session) =>
        session.tokenHash === tokenHash &&
        !session.revokedAt &&
        session.expiresAt > now,
    );
  }

  revokeSession(sessionId: string, revokedAt: string): void {
    const session = this.sessions.find(
      (candidate) => candidate.id === sessionId,
    );
    if (session) {
      session.revokedAt = revokedAt;
    }
  }

  createPasswordResetToken(input: {
    expiresAt: string;
    requestedIp?: string;
    tokenHash: string;
    userAgent?: string;
    userId: string;
  }): StoredPasswordResetToken {
    const token: StoredPasswordResetToken = {
      id: this.nextId("passwordResetToken", input.userId),
      tokenHash: input.tokenHash,
      userId: input.userId,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      requestedIp: input.requestedIp,
      userAgent: input.userAgent,
    };
    this.passwordResetTokens.push(token);
    return token;
  }

  findActivePasswordResetTokenByHash(
    tokenHash: string,
    now: string,
  ): StoredPasswordResetToken | undefined {
    return this.passwordResetTokens.find(
      (token) =>
        token.tokenHash === tokenHash && !token.usedAt && token.expiresAt > now,
    );
  }

  markPasswordResetTokenUsed(tokenId: string, usedAt: string): void {
    const token = this.passwordResetTokens.find(
      (candidate) => candidate.id === tokenId,
    );
    if (token) {
      token.usedAt = usedAt;
    }
  }

  createEmailOutboxItem(input: {
    htmlBody?: string;
    subject: string;
    textBody: string;
    to: string;
  }): StoredEmailOutboxItem {
    const item: StoredEmailOutboxItem = {
      id: this.nextId("emailOutbox", input.to),
      to: input.to.toLowerCase(),
      subject: input.subject,
      textBody: input.textBody,
      htmlBody: input.htmlBody,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    this.emailOutboxItems.push(item);
    return item;
  }

  listEmailOutboxItems(): StoredEmailOutboxItem[] {
    return [...this.emailOutboxItems].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  createInvitation(input: {
    email: string;
    expiresAt: string;
    inviterUserId: string;
    organizationId: string;
    role: UserRole;
    tokenHash: string;
  }): StoredInvitation {
    const invitation: StoredInvitation = {
      id: this.nextId("invitation", input.email),
      tokenHash: input.tokenHash,
      organizationId: input.organizationId,
      inviterUserId: input.inviterUserId,
      email: input.email.toLowerCase(),
      role: input.role,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
    this.invitations.push(invitation);
    return invitation;
  }

  findInvitationByTokenHash(tokenHash: string): StoredInvitation | undefined {
    return this.invitations.find(
      (invitation) => invitation.tokenHash === tokenHash,
    );
  }

  markInvitationAccepted(invitationId: string, acceptedAt: string): void {
    const invitation = this.invitations.find(
      (candidate) => candidate.id === invitationId,
    );
    if (invitation) {
      invitation.acceptedAt = acceptedAt;
    }
  }

  createAuditLog(): void {
    return undefined;
  }

  getUtilityRates(organizationId: string): UtilityRatesResponse {
    return (
      this.utilityRates.get(organizationId) ?? {
        electricPerKwh: 0.15,
        organizationId,
        waterPerGallon: 0.005,
      }
    );
  }

  upsertUtilityRates(input: {
    electricPerKwh: number;
    organizationId: string;
    waterPerGallon: number;
  }): UtilityRatesResponse {
    const rates: UtilityRatesResponse = {
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.utilityRates.set(input.organizationId, rates);
    return rates;
  }

  listBuildings(organizationId: string): Building[] {
    return this.buildings.filter(
      (building) => building.organizationId === organizationId,
    );
  }

  createBuilding(input: {
    address?: string;
    name: string;
    organizationId: string;
    timezone: string;
  }): Building {
    const building: Building = {
      id: this.nextId("building", input.name),
      organizationId: input.organizationId,
      name: input.name,
      address: input.address,
      timezone: input.timezone,
      lifecycleStatus: "active",
    };
    this.buildings.push(building);
    return building;
  }

  findBuildingById(
    organizationId: string,
    buildingId: string,
  ): Building | undefined {
    return this.buildings.find(
      (building) =>
        building.organizationId === organizationId &&
        building.id === buildingId,
    );
  }

  updateBuilding(
    organizationId: string,
    buildingId: string,
    input: Partial<
      Pick<
        Building,
        "address" | "archivedAt" | "lifecycleStatus" | "name" | "timezone"
      >
    >,
  ): Building | undefined {
    const building = this.findBuildingById(organizationId, buildingId);
    if (!building) {
      return undefined;
    }
    Object.assign(building, input);
    return building;
  }

  listFloors(organizationId: string, buildingId?: string): Floor[] {
    return this.floors.filter(
      (floor) =>
        floor.organizationId === organizationId &&
        (!buildingId || floor.buildingId === buildingId),
    );
  }

  createFloor(input: {
    buildingId: string;
    level: number;
    name: string;
    organizationId: string;
  }): Floor {
    const floor: Floor = {
      id: this.nextId("floor", input.name),
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      name: input.name,
      level: input.level,
      lifecycleStatus: "active",
    };
    this.floors.push(floor);
    return floor;
  }

  findFloorById(organizationId: string, floorId: string): Floor | undefined {
    return this.floors.find(
      (floor) =>
        floor.organizationId === organizationId && floor.id === floorId,
    );
  }

  updateFloor(
    organizationId: string,
    floorId: string,
    input: Partial<
      Pick<Floor, "archivedAt" | "level" | "lifecycleStatus" | "name">
    >,
  ): Floor | undefined {
    const floor = this.findFloorById(organizationId, floorId);
    if (!floor) {
      return undefined;
    }
    Object.assign(floor, input);
    return floor;
  }

  listUnits(input: {
    buildingId?: string;
    floorId?: string;
    organizationId: string;
  }): Unit[] {
    return this.units.filter(
      (unit) =>
        unit.organizationId === input.organizationId &&
        (!input.buildingId || unit.buildingId === input.buildingId) &&
        (!input.floorId || unit.floorId === input.floorId),
    );
  }

  createUnit(input: {
    buildingId: string;
    floorId?: string;
    name: string;
    occupancyStatus: Unit["occupancyStatus"];
    organizationId: string;
  }): Unit {
    const unit: Unit = {
      id: this.nextId("unit", input.name),
      organizationId: input.organizationId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      name: input.name,
      occupancyStatus: input.occupancyStatus,
      lifecycleStatus: "active",
    };
    this.units.push(unit);
    return unit;
  }

  findUnitById(organizationId: string, unitId: string): Unit | undefined {
    return this.units.find(
      (unit) => unit.organizationId === organizationId && unit.id === unitId,
    );
  }

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
  ): Unit | undefined {
    const unit = this.findUnitById(organizationId, unitId);
    if (!unit) {
      return undefined;
    }
    Object.assign(unit, input);
    return unit;
  }

  listMeters(input: {
    buildingId?: string;
    organizationId: string;
    status?: Meter["status"];
    unitId?: string;
    utilityType?: Meter["utilityType"];
  }): Meter[] {
    return this.meters.filter(
      (meter) =>
        meter.organizationId === input.organizationId &&
        (!input.buildingId || meter.buildingId === input.buildingId) &&
        (!input.unitId || meter.unitId === input.unitId) &&
        (!input.status || meter.status === input.status) &&
        (!input.utilityType || meter.utilityType === input.utilityType),
    );
  }

  findMeterById(organizationId: string, meterId: string): Meter | undefined {
    return this.meters.find(
      (meter) =>
        meter.organizationId === organizationId && meter.id === meterId,
    );
  }

  findMeterByExternalId(
    organizationId: string,
    externalId: string,
  ): Meter | undefined {
    return this.meters.find(
      (meter) =>
        meter.organizationId === organizationId &&
        meter.externalId === externalId,
    );
  }

  createMeter(
    input: Omit<Meter, "id" | "status"> & { status?: Meter["status"] },
  ): Meter {
    const meter: Meter = {
      ...input,
      id: this.nextId("meter", input.externalId),
      status: input.status ?? "online",
      lifecycleStatus: input.lifecycleStatus ?? "active",
    };
    this.meters.push(meter);
    return meter;
  }

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
  ): Meter | undefined {
    const meter = this.findMeterById(organizationId, meterId);
    if (!meter) {
      return undefined;
    }
    Object.assign(meter, input);
    return meter;
  }

  findReadingByMeterAndMeasuredAt(
    organizationId: string,
    meterId: string,
    measuredAt: string,
  ): MeterReading | undefined {
    return this.readings.find(
      (reading) =>
        reading.organizationId === organizationId &&
        reading.meterId === meterId &&
        reading.measuredAt === measuredAt,
    );
  }

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
  }): MeterReading {
    const reading: MeterReading = {
      id: this.nextId("reading", input.meterId),
      organizationId: input.organizationId,
      meterId: input.meterId,
      measuredAt: input.measuredAt,
      utilityType: input.utilityType,
      value: input.value,
      unit: input.unit,
      readingKind: input.readingKind,
      quality: input.quality ?? "good",
      receivedAt: input.receivedAt,
    };
    this.readings.push(reading);
    return reading;
  }

  listReadings(input: {
    from?: string;
    meterId: string;
    organizationId: string;
    to?: string;
  }): MeterReading[] {
    return this.readings
      .filter(
        (reading) =>
          reading.organizationId === input.organizationId &&
          reading.meterId === input.meterId &&
          (!input.from || reading.measuredAt >= input.from) &&
          (!input.to || reading.measuredAt <= input.to),
      )
      .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));
  }

  createUsageAggregate(
    input: Omit<UsageAggregate, "costEstimate" | "id"> & {
      costEstimate?: number;
    },
  ): UsageAggregate {
    const aggregate: UsageAggregate = {
      ...input,
      id: this.nextId("usageAggregate", `${input.meterId}_${input.periodType}`),
    };
    this.usageAggregates.push(aggregate);
    return aggregate;
  }

  replaceUsageAggregates(input: {
    aggregates: Array<Omit<UsageAggregate, "id">>;
    organizationId: string;
    periodType: UsageAggregate["periodType"];
  }): UsageAggregate[] {
    for (let index = this.usageAggregates.length - 1; index >= 0; index -= 1) {
      const aggregate = this.usageAggregates[index]!;
      if (
        aggregate.organizationId === input.organizationId &&
        aggregate.periodType === input.periodType
      ) {
        this.usageAggregates.splice(index, 1);
      }
    }

    return input.aggregates.map((aggregate) =>
      this.createUsageAggregate(aggregate),
    );
  }

  listUsageAggregates(input: {
    buildingId?: string;
    from?: string;
    meterId?: string;
    organizationId: string;
    periodType?: UsageAggregate["periodType"];
    to?: string;
    unitId?: string;
    utilityType?: UtilityType;
  }): UsageAggregate[] {
    return this.usageAggregates
      .filter(
        (aggregate) =>
          aggregate.organizationId === input.organizationId &&
          (!input.buildingId || aggregate.buildingId === input.buildingId) &&
          (!input.unitId || aggregate.unitId === input.unitId) &&
          (!input.meterId || aggregate.meterId === input.meterId) &&
          (!input.periodType || aggregate.periodType === input.periodType) &&
          (!input.utilityType || aggregate.utilityType === input.utilityType) &&
          (!input.from || aggregate.periodStart >= input.from) &&
          (!input.to || aggregate.periodEnd <= input.to),
      )
      .sort((left, right) =>
        left.periodStart === right.periodStart
          ? left.meterId.localeCompare(right.meterId)
          : left.periodStart.localeCompare(right.periodStart),
      );
  }

  createAlertRule(
    input: Omit<AlertRule, "enabled" | "id"> & {
      enabled?: boolean;
    },
  ): AlertRule {
    const rule: AlertRule = {
      ...input,
      enabled: input.enabled ?? true,
      id: this.nextId("alertRule", input.name),
    };
    this.alertRules.push(rule);
    return rule;
  }

  listAlertRules(input: { organizationId: string }): AlertRule[] {
    return this.alertRules.filter(
      (rule) => rule.organizationId === input.organizationId,
    );
  }

  findAlertRuleById(
    organizationId: string,
    ruleId: string,
  ): AlertRule | undefined {
    return this.alertRules.find(
      (rule) => rule.organizationId === organizationId && rule.id === ruleId,
    );
  }

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
  ): AlertRule | undefined {
    const rule = this.findAlertRuleById(organizationId, ruleId);
    if (!rule) {
      return undefined;
    }
    Object.assign(rule, input);
    return rule;
  }

  createAlertEvent(input: {
    message: string;
    organizationId: string;
    ruleId?: string;
    severity: AlertSeverity;
    title: string;
    triggeredAt: string;
  }): AlertEvent {
    const event: AlertEvent = {
      id: this.nextId("alertEvent", input.ruleId ?? input.title),
      message: input.message,
      organizationId: input.organizationId,
      ruleId: input.ruleId,
      severity: input.severity,
      status: "open",
      title: input.title,
      triggeredAt: input.triggeredAt,
    };
    this.alertEvents.push(event);
    return event;
  }

  listAlertEvents(input: {
    organizationId: string;
    severity?: AlertSeverity;
    status?: AlertStatus;
  }): AlertEvent[] {
    return this.alertEvents
      .filter(
        (event) =>
          event.organizationId === input.organizationId &&
          (!input.status || event.status === input.status) &&
          (!input.severity || event.severity === input.severity),
      )
      .sort((left, right) => right.triggeredAt.localeCompare(left.triggeredAt));
  }

  findAlertEventById(
    organizationId: string,
    alertId: string,
  ): AlertEvent | undefined {
    return this.alertEvents.find(
      (event) =>
        event.organizationId === organizationId && event.id === alertId,
    );
  }

  findOpenAlertForRule(
    organizationId: string,
    ruleId: string,
  ): AlertEvent | undefined {
    return this.alertEvents.find(
      (event) =>
        event.organizationId === organizationId &&
        event.ruleId === ruleId &&
        event.status !== "resolved",
    );
  }

  updateAlertEvent(
    organizationId: string,
    alertId: string,
    input: Partial<
      Pick<AlertEvent, "acknowledgedAt" | "resolvedAt" | "status">
    >,
  ): AlertEvent | undefined {
    const event = this.findAlertEventById(organizationId, alertId);
    if (!event) {
      return undefined;
    }
    Object.assign(event, input);
    return event;
  }

  resetDemoData(organizationId: string): void {
    const demoBuildingIds = new Set(
      this.buildings
        .filter(
          (building) =>
            building.organizationId === organizationId &&
            building.name.startsWith("Demo "),
        )
        .map((building) => building.id),
    );
    const demoMeterIds = new Set(
      this.meters
        .filter(
          (meter) =>
            meter.organizationId === organizationId &&
            (meter.externalId.startsWith("demo-") ||
              demoBuildingIds.has(meter.buildingId)),
        )
        .map((meter) => meter.id),
    );
    const demoRuleIds = new Set(
      this.alertRules
        .filter(
          (rule) =>
            rule.organizationId === organizationId &&
            rule.name.startsWith("Demo "),
        )
        .map((rule) => rule.id),
    );

    removeWhere(
      this.alertEvents,
      (event) =>
        event.organizationId === organizationId &&
        !!event.ruleId &&
        demoRuleIds.has(event.ruleId),
    );
    removeWhere(this.alertRules, (rule) => demoRuleIds.has(rule.id));
    removeWhere(this.usageAggregates, (aggregate) =>
      demoMeterIds.has(aggregate.meterId),
    );
    removeWhere(this.readings, (reading) => demoMeterIds.has(reading.meterId));
    removeWhere(this.meters, (meter) => demoMeterIds.has(meter.id));
    removeWhere(this.units, (unit) => demoBuildingIds.has(unit.buildingId));
    removeWhere(this.floors, (floor) => demoBuildingIds.has(floor.buildingId));
    removeWhere(this.buildings, (building) => demoBuildingIds.has(building.id));
  }

  private createBootstrapUser(
    id: string,
    email: string,
    name: string,
  ): StoredUser {
    return {
      id,
      email: email.toLowerCase(),
      name,
      passwordHash: createPasswordHash("password123"),
      createdAt: "2026-06-29T00:00:00.000Z",
    };
  }

  private createMembership(
    id: string,
    organizationId: string,
    userId: string,
    role: UserRole,
  ): Membership {
    return {
      id,
      organizationId,
      userId,
      role,
      status: "active",
    };
  }

  private nextId(kind: keyof typeof this.counters, seed: string): string {
    const counter = this.counters[kind]++;
    const slug = seed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 32);
    return `${kind}_${slug || "item"}_${counter}`;
  }
}

function removeWhere<T>(items: T[], predicate: (item: T) => boolean): void {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index]!)) {
      items.splice(index, 1);
    }
  }
}
