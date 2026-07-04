import type {
  AlertEvent,
  AlertRule,
  Building,
  Floor,
  IncidentActivity,
  IncidentEvidence,
  IncidentCorrelationSettings,
  LeakBaselineSettings,
  IncidentNotification,
  IncidentResponderSettings,
  IncidentSensorEvidence,
  LeakIncident,
  LeakDetectionPolicy,
  Membership,
  Meter,
  MeterReading,
  MoistureSensor,
  MoistureSensorEvent,
  Organization,
  Unit,
  UsageAggregate,
  UtilityRatesResponse,
  WorkOrder,
} from "@iot-management/types";
import { randomUUID } from "node:crypto";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Insertable, Selectable, sql } from "kysely";
import { createPasswordHash } from "../auth/password";
import { DatabaseService } from "../database/database.service";
import type {
  AlertEventRow,
  AlertRuleRow,
  AuditLogRow,
  BuildingRow,
  EmailOutboxRow,
  FloorRow,
  InvitationRow,
  IncidentActivityRow,
  IncidentEvidenceRow,
  IncidentCorrelationSettingsRow,
  LeakBaselineSettingsRow,
  IncidentNotificationRow,
  IncidentResponderSettingsRow,
  IncidentSensorEvidenceRow,
  LeakIncidentRow,
  LeakDetectionPolicyRow,
  MembershipRow,
  MeterReadingRow,
  MeterRow,
  MoistureSensorEventRow,
  MoistureSensorRow,
  OrganizationUtilityRatesRow,
  OrganizationRow,
  PasswordResetTokenRow,
  SessionRow,
  UnitRow,
  UsageAggregateRow,
  UserRow,
  WorkOrderRow,
} from "../database/schema";
import { validateApiEnv } from "../config/env.schema";
import type {
  DashboardAggregateQuery,
  DashboardBuildingAggregate,
  DashboardTrendAggregate,
  DashboardUnitAggregate,
  PersistenceService,
  StoredAuditLog,
  StoredEmailOutboxItem,
  StoredInvitation,
  StoredPasswordResetToken,
  StoredSession,
  UserOrganization,
} from "./persistence.service";
import type { StoredUser } from "./in-memory-persistence.service";

@Injectable()
export class PostgresPersistenceService
  implements PersistenceService, OnModuleInit
{
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (validateApiEnv().nodeEnv !== "production") {
      await this.ensureBootstrapData();
    }
  }

  async ensureBootstrapData(): Promise<void> {
    const now = "2026-06-29T00:00:00.000Z";
    const db = this.database.db;

    await db
      .insertInto("organizations")
      .values([
        {
          id: "org_north",
          name: "North Properties",
          status: "active",
          created_at: now,
        },
        {
          id: "org_south",
          name: "South Properties",
          status: "active",
          created_at: now,
        },
      ])
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();

    await db
      .insertInto("users")
      .values([
        this.bootstrapUser(
          "user_north_owner",
          "owner@north.example",
          "North Owner",
        ),
        this.bootstrapUser(
          "user_north_manager",
          "manager@north.example",
          "North Manager",
        ),
        this.bootstrapUser(
          "user_north_viewer",
          "viewer@north.example",
          "North Viewer",
        ),
        this.bootstrapUser(
          "user_south_owner",
          "owner@south.example",
          "South Owner",
        ),
      ])
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();

    await db
      .insertInto("memberships")
      .values([
        {
          id: "membership_north_owner",
          organization_id: "org_north",
          user_id: "user_north_owner",
          role: "owner",
          status: "active",
        },
        {
          id: "membership_north_manager",
          organization_id: "org_north",
          user_id: "user_north_manager",
          role: "manager",
          status: "active",
        },
        {
          id: "membership_north_viewer",
          organization_id: "org_north",
          user_id: "user_north_viewer",
          role: "viewer",
          status: "active",
        },
        {
          id: "membership_south_owner",
          organization_id: "org_south",
          user_id: "user_south_owner",
          role: "owner",
          status: "active",
        },
      ])
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();

    await db
      .insertInto("buildings")
      .values({
        id: "building_south",
        organization_id: "org_south",
        name: "South Tower",
        address: "200 South St",
        timezone: "America/Detroit",
        lifecycle_status: "active",
        archived_at: null,
      })
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();

    await db
      .insertInto("floors")
      .values({
        id: "floor_south_1",
        organization_id: "org_south",
        building_id: "building_south",
        name: "Level 1",
        level: 1,
        lifecycle_status: "active",
        archived_at: null,
      })
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();

    await db
      .insertInto("units")
      .values({
        id: "unit_south_101",
        organization_id: "org_south",
        building_id: "building_south",
        floor_id: "floor_south_1",
        name: "101",
        occupancy_status: "occupied",
        lifecycle_status: "active",
        archived_at: null,
      })
      .onConflict((conflict) => conflict.column("id").doNothing())
      .execute();
  }

  async findUserByEmail(email: string): Promise<StoredUser | undefined> {
    const row = await this.database.db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst();
    return row ? mapUser(row) : undefined;
  }

  async findUserById(userId: string): Promise<StoredUser | undefined> {
    const row = await this.database.db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst();
    return row ? mapUser(row) : undefined;
  }

  async updateUserPasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<StoredUser | undefined> {
    const row = await this.database.db
      .updateTable("users")
      .set({ password_hash: passwordHash })
      .where("id", "=", userId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapUser(row) : undefined;
  }

  async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<StoredUser> {
    const email = input.email.toLowerCase();
    const row = await this.database.db
      .insertInto("users")
      .values({
        id: `user_${slug(email)}`,
        email,
        name: input.name,
        password_hash: input.passwordHash,
        created_at: new Date().toISOString(),
      })
      .onConflict((conflict) =>
        conflict.column("email").doUpdateSet({
          name: input.name,
          password_hash: input.passwordHash,
        }),
      )
      .returningAll()
      .executeTakeFirst();
    if (row) {
      return mapUser(row);
    }
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error(`Unable to create user ${email}`);
    }
    return user;
  }

  async findPrimaryMembershipForUser(
    userId: string,
  ): Promise<Membership | undefined> {
    const row = await this.database.db
      .selectFrom("memberships")
      .selectAll()
      .where("user_id", "=", userId)
      .executeTakeFirst();
    return row ? mapMembership(row) : undefined;
  }

  async findMembershipById(
    membershipId: string,
  ): Promise<Membership | undefined> {
    const row = await this.database.db
      .selectFrom("memberships")
      .selectAll()
      .where("id", "=", membershipId)
      .executeTakeFirst();
    return row ? mapMembership(row) : undefined;
  }

  async findOrganizationById(
    organizationId: string,
  ): Promise<UserOrganization | undefined> {
    const row = await this.database.db
      .selectFrom("organizations")
      .selectAll()
      .where("id", "=", organizationId)
      .executeTakeFirst();
    return row ? mapOrganization(row) : undefined;
  }

  async createMembershipForCurrentOrganization(input: {
    email: string;
    organizationId: string;
    role: Membership["role"];
  }): Promise<Membership> {
    const email = input.email.toLowerCase();
    const userId = `user_${slug(email)}`;
    const membershipId = `membership_${userId}_${input.organizationId}`;

    await this.database.db
      .insertInto("users")
      .values({
        id: userId,
        email,
        name: input.email,
        password_hash: createPasswordHash("password123"),
        created_at: new Date().toISOString(),
      })
      .onConflict((conflict) => conflict.column("email").doNothing())
      .execute();

    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error(`Unable to create user ${email}`);
    }

    await this.database.db
      .insertInto("memberships")
      .values({
        id: membershipId,
        organization_id: input.organizationId,
        user_id: user.id,
        role: input.role,
        status: "active",
      })
      .onConflict((conflict) =>
        conflict.columns(["organization_id", "user_id"]).doUpdateSet({
          role: input.role,
          status: "active",
        }),
      )
      .execute();

    const membership = await this.findMembershipByOrganizationAndUser(
      input.organizationId,
      user.id,
    );
    if (!membership) {
      throw new Error(`Unable to create membership for ${email}`);
    }
    return membership;
  }

  async listMemberships(organizationId: string): Promise<Membership[]> {
    const rows = await this.database.db
      .selectFrom("memberships")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .orderBy("role")
      .execute();
    return rows.map(mapMembership);
  }

  async findMembershipByOrganizationAndId(
    organizationId: string,
    membershipId: string,
  ): Promise<Membership | undefined> {
    const row = await this.database.db
      .selectFrom("memberships")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", membershipId)
      .executeTakeFirst();
    return row ? mapMembership(row) : undefined;
  }

  async findMembershipByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<Membership | undefined> {
    const row = await this.database.db
      .selectFrom("memberships")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("user_id", "=", userId)
      .executeTakeFirst();
    return row ? mapMembership(row) : undefined;
  }

  async updateMembershipRole(
    organizationId: string,
    membershipId: string,
    role: Membership["role"],
  ): Promise<Membership | undefined> {
    const row = await this.database.db
      .updateTable("memberships")
      .set({ role })
      .where("organization_id", "=", organizationId)
      .where("id", "=", membershipId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapMembership(row) : undefined;
  }

  async updateMembershipStatus(
    organizationId: string,
    membershipId: string,
    status: "active" | "disabled",
  ): Promise<Membership | undefined> {
    const row = await this.database.db
      .updateTable("memberships")
      .set({ status })
      .where("organization_id", "=", organizationId)
      .where("id", "=", membershipId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapMembership(row) : undefined;
  }

  async countActiveOwners(organizationId: string): Promise<number> {
    const result = await this.database.db
      .selectFrom("memberships")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("organization_id", "=", organizationId)
      .where("role", "=", "owner")
      .where("status", "=", "active")
      .executeTakeFirst();
    return Number(result?.count ?? "0");
  }

  async createSession(input: {
    expiresAt: string;
    ipAddress?: string;
    membershipId: string;
    organizationId: string;
    tokenHash: string;
    userAgent?: string;
    userId: string;
  }): Promise<StoredSession> {
    const row = await this.database.db
      .insertInto("sessions")
      .values({
        id: randomUUID(),
        token_hash: input.tokenHash,
        user_id: input.userId,
        organization_id: input.organizationId,
        membership_id: input.membershipId,
        created_at: new Date().toISOString(),
        expires_at: input.expiresAt,
        revoked_at: null,
        user_agent: input.userAgent ?? null,
        ip_address: input.ipAddress ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapSession(row);
  }

  async findActiveSessionByTokenHash(
    tokenHash: string,
    now: string,
  ): Promise<StoredSession | undefined> {
    const row = await this.database.db
      .selectFrom("sessions")
      .selectAll()
      .where("token_hash", "=", tokenHash)
      .where("revoked_at", "is", null)
      .where("expires_at", ">", new Date(now))
      .executeTakeFirst();
    return row ? mapSession(row) : undefined;
  }

  async revokeSession(sessionId: string, revokedAt: string): Promise<void> {
    await this.database.db
      .updateTable("sessions")
      .set({ revoked_at: revokedAt })
      .where("id", "=", sessionId)
      .where("revoked_at", "is", null)
      .execute();
  }

  async createPasswordResetToken(input: {
    expiresAt: string;
    requestedIp?: string;
    tokenHash: string;
    userAgent?: string;
    userId: string;
  }): Promise<StoredPasswordResetToken> {
    const row = await this.database.db
      .insertInto("password_reset_tokens")
      .values({
        id: randomUUID(),
        token_hash: input.tokenHash,
        user_id: input.userId,
        created_at: new Date().toISOString(),
        expires_at: input.expiresAt,
        used_at: null,
        requested_ip: input.requestedIp ?? null,
        user_agent: input.userAgent ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapPasswordResetToken(row);
  }

  async findActivePasswordResetTokenByHash(
    tokenHash: string,
    now: string,
  ): Promise<StoredPasswordResetToken | undefined> {
    const row = await this.database.db
      .selectFrom("password_reset_tokens")
      .selectAll()
      .where("token_hash", "=", tokenHash)
      .where("used_at", "is", null)
      .where("expires_at", ">", new Date(now))
      .executeTakeFirst();
    return row ? mapPasswordResetToken(row) : undefined;
  }

  async markPasswordResetTokenUsed(
    tokenId: string,
    usedAt: string,
  ): Promise<void> {
    await this.database.db
      .updateTable("password_reset_tokens")
      .set({ used_at: usedAt })
      .where("id", "=", tokenId)
      .where("used_at", "is", null)
      .execute();
  }

  async createEmailOutboxItem(input: {
    dedupeKey?: string;
    htmlBody?: string;
    subject: string;
    textBody: string;
    to: string;
  }): Promise<StoredEmailOutboxItem> {
    const row = await this.database.db
      .insertInto("email_outbox")
      .values({
        id: randomUUID(),
        to_email: input.to.toLowerCase(),
        subject: input.subject,
        text_body: input.textBody,
        html_body: input.htmlBody ?? null,
        status: "queued",
        created_at: new Date().toISOString(),
        dedupe_key: input.dedupeKey ?? null,
        sent_at: null,
      })
      .onConflict((conflict) => conflict.column("dedupe_key").doNothing())
      .returningAll()
      .executeTakeFirst();
    if (row) {
      return mapEmailOutboxItem(row);
    }
    if (input.dedupeKey) {
      const existing = await this.database.db
        .selectFrom("email_outbox")
        .selectAll()
        .where("dedupe_key", "=", input.dedupeKey)
        .executeTakeFirst();
      if (existing) {
        return mapEmailOutboxItem(existing);
      }
    }
    throw new Error("Unable to create email outbox item");
  }

  async listEmailOutboxItems(): Promise<StoredEmailOutboxItem[]> {
    const rows = await this.database.db
      .selectFrom("email_outbox")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(mapEmailOutboxItem);
  }

  async createInvitation(input: {
    email: string;
    expiresAt: string;
    inviterUserId: string;
    organizationId: string;
    role: Membership["role"];
    tokenHash: string;
  }): Promise<StoredInvitation> {
    const row = await this.database.db
      .insertInto("invitations")
      .values({
        id: randomUUID(),
        token_hash: input.tokenHash,
        organization_id: input.organizationId,
        inviter_user_id: input.inviterUserId,
        email: input.email.toLowerCase(),
        role: input.role,
        created_at: new Date().toISOString(),
        expires_at: input.expiresAt,
        accepted_at: null,
        revoked_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapInvitation(row);
  }

  async findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<StoredInvitation | undefined> {
    const row = await this.database.db
      .selectFrom("invitations")
      .selectAll()
      .where("token_hash", "=", tokenHash)
      .executeTakeFirst();
    return row ? mapInvitation(row) : undefined;
  }

  async markInvitationAccepted(
    invitationId: string,
    acceptedAt: string,
  ): Promise<void> {
    await this.database.db
      .updateTable("invitations")
      .set({ accepted_at: acceptedAt })
      .where("id", "=", invitationId)
      .where("accepted_at", "is", null)
      .execute();
  }

  async createAuditLog(input: {
    action: string;
    actorUserId?: string;
    metadata?: Record<string, unknown>;
    organizationId: string;
    targetId: string;
    targetType: string;
  }): Promise<void> {
    await this.database.db
      .insertInto("audit_logs")
      .values({
        id: randomUUID(),
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId ?? null,
        action: input.action,
        target_type: input.targetType,
        target_id: input.targetId,
        metadata: JSON.stringify(input.metadata ?? {}),
        created_at: new Date().toISOString(),
      })
      .execute();
  }

  async listAuditLogs(input: {
    action?: string;
    limit?: number;
    organizationId: string;
    targetType?: string;
  }): Promise<StoredAuditLog[]> {
    let query = this.database.db
      .selectFrom("audit_logs")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .orderBy("created_at", "desc")
      .limit(Math.min(Math.max(input.limit ?? 50, 1), 100));

    if (input.action) {
      query = query.where("action", "=", input.action);
    }

    if (input.targetType) {
      query = query.where("target_type", "=", input.targetType);
    }

    const rows = await query.execute();
    return rows.map(mapAuditLog);
  }

  async getUtilityRates(organizationId: string): Promise<UtilityRatesResponse> {
    const row = await this.database.db
      .selectFrom("organization_utility_rates")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();
    return row
      ? mapUtilityRates(row)
      : {
          electricPerKwh: 0.15,
          organizationId,
          waterPerGallon: 0.005,
        };
  }

  async upsertUtilityRates(input: {
    electricPerKwh: number;
    organizationId: string;
    waterPerGallon: number;
  }): Promise<UtilityRatesResponse> {
    const row = await this.database.db
      .insertInto("organization_utility_rates")
      .values({
        electric_per_kwh: input.electricPerKwh,
        organization_id: input.organizationId,
        updated_at: new Date().toISOString(),
        water_per_gallon: input.waterPerGallon,
      })
      .onConflict((conflict) =>
        conflict.column("organization_id").doUpdateSet({
          electric_per_kwh: input.electricPerKwh,
          updated_at: new Date().toISOString(),
          water_per_gallon: input.waterPerGallon,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapUtilityRates(row);
  }

  async listBuildings(organizationId: string): Promise<Building[]> {
    const rows = await this.database.db
      .selectFrom("buildings")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .orderBy("name")
      .execute();
    return rows.map(mapBuilding);
  }

  async createBuilding(input: {
    address?: string;
    name: string;
    organizationId: string;
    timezone: string;
  }): Promise<Building> {
    const row = await this.database.db
      .insertInto("buildings")
      .values({
        id: await this.nextId("building", input.name, "buildings"),
        organization_id: input.organizationId,
        name: input.name,
        address: input.address ?? null,
        timezone: input.timezone,
        lifecycle_status: "active",
        archived_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapBuilding(row);
  }

  async findBuildingById(
    organizationId: string,
    buildingId: string,
  ): Promise<Building | undefined> {
    const row = await this.database.db
      .selectFrom("buildings")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", buildingId)
      .executeTakeFirst();
    return row ? mapBuilding(row) : undefined;
  }

  async updateBuilding(
    organizationId: string,
    buildingId: string,
    input: Partial<
      Pick<
        Building,
        "address" | "archivedAt" | "lifecycleStatus" | "name" | "timezone"
      >
    >,
  ): Promise<Building | undefined> {
    const changes = defined({
      address: input.address,
      archived_at:
        "archivedAt" in input ? (input.archivedAt ?? null) : undefined,
      lifecycle_status: input.lifecycleStatus,
      name: input.name,
      timezone: input.timezone,
    });
    if (!Object.keys(changes).length) {
      return this.findBuildingById(organizationId, buildingId);
    }
    const row = await this.database.db
      .updateTable("buildings")
      .set(changes)
      .where("organization_id", "=", organizationId)
      .where("id", "=", buildingId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapBuilding(row) : undefined;
  }

  async listFloors(
    organizationId: string,
    buildingId?: string,
  ): Promise<Floor[]> {
    let query = this.database.db
      .selectFrom("floors")
      .selectAll()
      .where("organization_id", "=", organizationId);
    if (buildingId) {
      query = query.where("building_id", "=", buildingId);
    }
    const rows = await query.orderBy("level").execute();
    return rows.map(mapFloor);
  }

  async createFloor(input: {
    buildingId: string;
    level: number;
    name: string;
    organizationId: string;
  }): Promise<Floor> {
    const row = await this.database.db
      .insertInto("floors")
      .values({
        id: await this.nextId("floor", input.name, "floors"),
        organization_id: input.organizationId,
        building_id: input.buildingId,
        name: input.name,
        level: input.level,
        lifecycle_status: "active",
        archived_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapFloor(row);
  }

  async findFloorById(
    organizationId: string,
    floorId: string,
  ): Promise<Floor | undefined> {
    const row = await this.database.db
      .selectFrom("floors")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", floorId)
      .executeTakeFirst();
    return row ? mapFloor(row) : undefined;
  }

  async updateFloor(
    organizationId: string,
    floorId: string,
    input: Partial<
      Pick<Floor, "archivedAt" | "level" | "lifecycleStatus" | "name">
    >,
  ): Promise<Floor | undefined> {
    const changes = defined({
      archived_at:
        "archivedAt" in input ? (input.archivedAt ?? null) : undefined,
      level: input.level,
      lifecycle_status: input.lifecycleStatus,
      name: input.name,
    });
    if (!Object.keys(changes).length) {
      return this.findFloorById(organizationId, floorId);
    }
    const row = await this.database.db
      .updateTable("floors")
      .set(changes)
      .where("organization_id", "=", organizationId)
      .where("id", "=", floorId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapFloor(row) : undefined;
  }

  async listUnits(input: {
    buildingId?: string;
    floorId?: string;
    organizationId: string;
  }): Promise<Unit[]> {
    let query = this.database.db
      .selectFrom("units")
      .selectAll()
      .where("organization_id", "=", input.organizationId);
    if (input.buildingId) {
      query = query.where("building_id", "=", input.buildingId);
    }
    if (input.floorId) {
      query = query.where("floor_id", "=", input.floorId);
    }
    const rows = await query.orderBy("name").execute();
    return rows.map(mapUnit);
  }

  async createUnit(input: {
    buildingId: string;
    floorId?: string;
    name: string;
    occupancyStatus: Unit["occupancyStatus"];
    organizationId: string;
  }): Promise<Unit> {
    const row = await this.database.db
      .insertInto("units")
      .values({
        id: await this.nextId("unit", input.name, "units"),
        organization_id: input.organizationId,
        building_id: input.buildingId,
        floor_id: input.floorId ?? null,
        name: input.name,
        occupancy_status: input.occupancyStatus,
        lifecycle_status: "active",
        archived_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapUnit(row);
  }

  async findUnitById(
    organizationId: string,
    unitId: string,
  ): Promise<Unit | undefined> {
    const row = await this.database.db
      .selectFrom("units")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", unitId)
      .executeTakeFirst();
    return row ? mapUnit(row) : undefined;
  }

  async updateUnit(
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
  ): Promise<Unit | undefined> {
    const changes = defined({
      archived_at:
        "archivedAt" in input ? (input.archivedAt ?? null) : undefined,
      floor_id: input.floorId,
      lifecycle_status: input.lifecycleStatus,
      name: input.name,
      occupancy_status: input.occupancyStatus,
    });
    if (!Object.keys(changes).length) {
      return this.findUnitById(organizationId, unitId);
    }
    const row = await this.database.db
      .updateTable("units")
      .set(changes)
      .where("organization_id", "=", organizationId)
      .where("id", "=", unitId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapUnit(row) : undefined;
  }

  async listMeters(input: {
    buildingId?: string;
    organizationId: string;
    status?: Meter["status"];
    unitId?: string;
    utilityType?: Meter["utilityType"];
  }): Promise<Meter[]> {
    let query = this.database.db
      .selectFrom("meters")
      .selectAll()
      .where("organization_id", "=", input.organizationId);
    if (input.buildingId) {
      query = query.where("building_id", "=", input.buildingId);
    }
    if (input.unitId) {
      query = query.where("unit_id", "=", input.unitId);
    }
    if (input.status) {
      query = query.where("status", "=", input.status);
    }
    if (input.utilityType) {
      query = query.where("utility_type", "=", input.utilityType);
    }
    const rows = await query.orderBy("external_id").execute();
    return rows.map(mapMeter);
  }

  async findMeterById(
    organizationId: string,
    meterId: string,
  ): Promise<Meter | undefined> {
    const row = await this.database.db
      .selectFrom("meters")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", meterId)
      .executeTakeFirst();
    return row ? mapMeter(row) : undefined;
  }

  async findMeterByExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<Meter | undefined> {
    const row = await this.database.db
      .selectFrom("meters")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("external_id", "=", externalId)
      .executeTakeFirst();
    return row ? mapMeter(row) : undefined;
  }

  async createMeter(
    input: Omit<Meter, "id" | "status"> & { status?: Meter["status"] },
  ): Promise<Meter> {
    const row = await this.database.db
      .insertInto("meters")
      .values({
        id: await this.nextId("meter", input.externalId, "meters"),
        organization_id: input.organizationId,
        building_id: input.buildingId,
        floor_id: input.floorId ?? null,
        unit_id: input.unitId ?? null,
        utility_type: input.utilityType,
        source: input.source,
        external_id: input.externalId,
        status: input.status ?? "online",
        installed_at: input.installedAt ?? null,
        last_reading_at: input.lastReadingAt ?? null,
        lifecycle_status: input.lifecycleStatus ?? "active",
        archived_at: input.archivedAt ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapMeter(row);
  }

  async updateMeter(
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
  ): Promise<Meter | undefined> {
    const changes = defined({
      archived_at:
        "archivedAt" in input ? (input.archivedAt ?? null) : undefined,
      floor_id: input.floorId,
      installed_at: input.installedAt,
      last_reading_at: input.lastReadingAt,
      lifecycle_status: input.lifecycleStatus,
      status: input.status,
      unit_id: input.unitId,
    });
    if (!Object.keys(changes).length) {
      return this.findMeterById(organizationId, meterId);
    }
    const row = await this.database.db
      .updateTable("meters")
      .set(changes)
      .where("organization_id", "=", organizationId)
      .where("id", "=", meterId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapMeter(row) : undefined;
  }

  async findReadingByMeterAndMeasuredAt(
    organizationId: string,
    meterId: string,
    measuredAt: string,
  ): Promise<MeterReading | undefined> {
    const row = await this.database.db
      .selectFrom("meter_readings")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("meter_id", "=", meterId)
      .where("measured_at", "=", new Date(measuredAt))
      .executeTakeFirst();
    return row ? mapReading(row) : undefined;
  }

  async createReading(input: {
    measuredAt: string;
    meterId: string;
    organizationId: string;
    quality?: MeterReading["quality"];
    readingKind: MeterReading["readingKind"];
    receivedAt: string;
    unit: MeterReading["unit"];
    utilityType: MeterReading["utilityType"];
    value: number;
  }): Promise<MeterReading> {
    const row = await this.database.db
      .insertInto("meter_readings")
      .values({
        id: randomUUID(),
        organization_id: input.organizationId,
        meter_id: input.meterId,
        measured_at: input.measuredAt,
        utility_type: input.utilityType,
        value: input.value,
        unit: input.unit,
        reading_kind: input.readingKind,
        quality: input.quality ?? "good",
        received_at: input.receivedAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapReading(row);
  }

  async listReadings(input: {
    from?: string;
    meterId: string;
    organizationId: string;
    to?: string;
  }): Promise<MeterReading[]> {
    let query = this.database.db
      .selectFrom("meter_readings")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("meter_id", "=", input.meterId);
    if (input.from) {
      query = query.where("measured_at", ">=", new Date(input.from));
    }
    if (input.to) {
      query = query.where("measured_at", "<=", new Date(input.to));
    }
    const rows = await query.orderBy("measured_at").execute();
    return rows.map(mapReading);
  }

  async createUsageAggregate(
    input: Omit<UsageAggregate, "costEstimate" | "id"> & {
      costEstimate?: number;
    },
  ): Promise<UsageAggregate> {
    const row = await this.database.db
      .insertInto("usage_aggregates")
      .values({
        id: randomUUID(),
        organization_id: input.organizationId,
        meter_id: input.meterId,
        building_id: input.buildingId,
        unit_id: input.unitId ?? null,
        utility_type: input.utilityType,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        period_type: input.periodType,
        usage_value: input.usageValue,
        cost_estimate: input.costEstimate ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapUsageAggregate(row);
  }

  async replaceUsageAggregates(input: {
    aggregates: Array<Omit<UsageAggregate, "id">>;
    organizationId: string;
    periodType: UsageAggregate["periodType"];
  }): Promise<UsageAggregate[]> {
    await this.database.db
      .deleteFrom("usage_aggregates")
      .where("organization_id", "=", input.organizationId)
      .where("period_type", "=", input.periodType)
      .execute();

    const created: UsageAggregate[] = [];
    for (const aggregate of input.aggregates) {
      created.push(await this.createUsageAggregate(aggregate));
    }
    return created;
  }

  async listUsageAggregates(input: {
    buildingId?: string;
    from?: string;
    meterId?: string;
    organizationId: string;
    periodType?: UsageAggregate["periodType"];
    to?: string;
    unitId?: string;
    utilityType?: Meter["utilityType"];
  }): Promise<UsageAggregate[]> {
    let query = this.database.db
      .selectFrom("usage_aggregates")
      .selectAll()
      .where("organization_id", "=", input.organizationId);
    if (input.buildingId) {
      query = query.where("building_id", "=", input.buildingId);
    }
    if (input.unitId) {
      query = query.where("unit_id", "=", input.unitId);
    }
    if (input.meterId) {
      query = query.where("meter_id", "=", input.meterId);
    }
    if (input.periodType) {
      query = query.where("period_type", "=", input.periodType);
    }
    if (input.utilityType) {
      query = query.where("utility_type", "=", input.utilityType);
    }
    if (input.from) {
      query = query.where("period_start", ">=", new Date(input.from));
    }
    if (input.to) {
      query = query.where("period_end", "<=", new Date(input.to));
    }
    const rows = await query
      .orderBy("period_start")
      .orderBy("meter_id")
      .execute();
    return rows.map(mapUsageAggregate);
  }

  async listDashboardTrendAggregates(
    input: DashboardAggregateQuery,
  ): Promise<DashboardTrendAggregate[]> {
    let query = this.database.db
      .selectFrom("usage_aggregates")
      .select([
        "usage_aggregates.period_start as period_start",
        "usage_aggregates.period_end as period_end",
        "usage_aggregates.utility_type as utility_type",
        sql<string>`sum(usage_aggregates.usage_value)`.as("usage_value"),
        sql<string>`coalesce(sum(usage_aggregates.cost_estimate), 0)`.as(
          "cost_estimate",
        ),
        sql<string>`coalesce(sum(case when usage_aggregates.cost_estimate is null then usage_aggregates.usage_value else 0 end), 0)`.as(
          "usage_without_cost_estimate",
        ),
      ])
      .where("usage_aggregates.organization_id", "=", input.organizationId)
      .where("usage_aggregates.period_type", "=", input.periodType);
    if (input.buildingId) {
      query = query.where(
        "usage_aggregates.building_id",
        "=",
        input.buildingId,
      );
    }
    if (input.utilityType) {
      query = query.where(
        "usage_aggregates.utility_type",
        "=",
        input.utilityType,
      );
    }
    if (input.from) {
      query = query.where(
        "usage_aggregates.period_start",
        ">=",
        new Date(input.from),
      );
    }
    if (input.to) {
      query = query.where(
        "usage_aggregates.period_start",
        "<",
        new Date(input.to),
      );
    }
    const rows = await query
      .groupBy([
        "usage_aggregates.period_start",
        "usage_aggregates.period_end",
        "usage_aggregates.utility_type",
      ])
      .orderBy("usage_aggregates.period_start")
      .orderBy("usage_aggregates.utility_type")
      .execute();
    return rows.map((row) => ({
      costEstimate: Number(row.cost_estimate),
      periodEnd: iso(row.period_end),
      periodStart: iso(row.period_start),
      usageValue: Number(row.usage_value),
      usageWithoutCostEstimate: Number(row.usage_without_cost_estimate),
      utilityType: row.utility_type,
    }));
  }

  async listDashboardBuildingAggregates(
    input: DashboardAggregateQuery,
  ): Promise<DashboardBuildingAggregate[]> {
    let query = this.database.db
      .selectFrom("usage_aggregates")
      .innerJoin("buildings", (join) =>
        join
          .onRef("buildings.id", "=", "usage_aggregates.building_id")
          .onRef(
            "buildings.organization_id",
            "=",
            "usage_aggregates.organization_id",
          ),
      )
      .select([
        "usage_aggregates.building_id as building_id",
        "buildings.name as building_name",
        "usage_aggregates.utility_type as utility_type",
        sql<string>`sum(usage_aggregates.usage_value)`.as("usage_value"),
        sql<string>`coalesce(sum(usage_aggregates.cost_estimate), 0)`.as(
          "cost_estimate",
        ),
        sql<string>`coalesce(sum(case when usage_aggregates.cost_estimate is null then usage_aggregates.usage_value else 0 end), 0)`.as(
          "usage_without_cost_estimate",
        ),
      ])
      .where("usage_aggregates.organization_id", "=", input.organizationId)
      .where("usage_aggregates.period_type", "=", input.periodType);
    if (input.buildingId) {
      query = query.where(
        "usage_aggregates.building_id",
        "=",
        input.buildingId,
      );
    }
    if (input.utilityType) {
      query = query.where(
        "usage_aggregates.utility_type",
        "=",
        input.utilityType,
      );
    }
    if (input.from) {
      query = query.where(
        "usage_aggregates.period_start",
        ">=",
        new Date(input.from),
      );
    }
    if (input.to) {
      query = query.where(
        "usage_aggregates.period_start",
        "<",
        new Date(input.to),
      );
    }
    const rows = await query
      .groupBy([
        "usage_aggregates.building_id",
        "buildings.name",
        "usage_aggregates.utility_type",
      ])
      .orderBy("buildings.name")
      .execute();
    return rows.map((row) => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      costEstimate: Number(row.cost_estimate),
      usageValue: Number(row.usage_value),
      usageWithoutCostEstimate: Number(row.usage_without_cost_estimate),
      utilityType: row.utility_type,
    }));
  }

  async listDashboardUnitAggregates(
    input: DashboardAggregateQuery,
  ): Promise<DashboardUnitAggregate[]> {
    let query = this.database.db
      .selectFrom("usage_aggregates")
      .innerJoin("buildings", (join) =>
        join
          .onRef("buildings.id", "=", "usage_aggregates.building_id")
          .onRef(
            "buildings.organization_id",
            "=",
            "usage_aggregates.organization_id",
          ),
      )
      .innerJoin("units", (join) =>
        join
          .onRef("units.id", "=", "usage_aggregates.unit_id")
          .onRef(
            "units.organization_id",
            "=",
            "usage_aggregates.organization_id",
          ),
      )
      .select([
        "usage_aggregates.unit_id as unit_id",
        "units.name as unit_name",
        "usage_aggregates.building_id as building_id",
        "buildings.name as building_name",
        "usage_aggregates.utility_type as utility_type",
        sql<string>`sum(usage_aggregates.usage_value)`.as("usage_value"),
      ])
      .where("usage_aggregates.organization_id", "=", input.organizationId)
      .where("usage_aggregates.period_type", "=", input.periodType)
      .where("usage_aggregates.unit_id", "is not", null);
    if (input.buildingId) {
      query = query.where(
        "usage_aggregates.building_id",
        "=",
        input.buildingId,
      );
    }
    if (input.utilityType) {
      query = query.where(
        "usage_aggregates.utility_type",
        "=",
        input.utilityType,
      );
    }
    if (input.from) {
      query = query.where(
        "usage_aggregates.period_start",
        ">=",
        new Date(input.from),
      );
    }
    if (input.to) {
      query = query.where(
        "usage_aggregates.period_start",
        "<",
        new Date(input.to),
      );
    }
    if (input.limit) {
      query = query.limit(input.limit);
    }
    const rows = await query
      .groupBy([
        "usage_aggregates.unit_id",
        "units.name",
        "usage_aggregates.building_id",
        "buildings.name",
        "usage_aggregates.utility_type",
      ])
      .orderBy(sql`sum(usage_aggregates.usage_value)`, "desc")
      .execute();
    return rows.map((row) => ({
      buildingId: row.building_id,
      buildingName: row.building_name,
      unitId: row.unit_id!,
      unitName: row.unit_name,
      usageValue: Number(row.usage_value),
      utilityType: row.utility_type,
    }));
  }

  async createAlertRule(
    input: Omit<AlertRule, "enabled" | "id"> & {
      enabled?: boolean;
    },
  ): Promise<AlertRule> {
    const row = await this.database.db
      .insertInto("alert_rules")
      .values({
        id: await this.nextId("alertRule", input.name, "alert_rules"),
        organization_id: input.organizationId,
        name: input.name,
        utility_type: input.utilityType ?? null,
        scope_type: input.scopeType,
        scope_id: input.scopeId ?? null,
        condition_type: input.conditionType,
        threshold: input.threshold ?? null,
        window_minutes: input.windowMinutes,
        enabled: input.enabled ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapAlertRule(row);
  }

  async createLeakIncident(input: {
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
  }): Promise<LeakIncident> {
    const row = await this.database.db
      .insertInto("leak_incidents")
      .values({
        id: await this.nextId("leakIncident", input.title, "leak_incidents"),
        organization_id: input.organizationId,
        building_id: input.buildingId,
        unit_id: input.unitId ?? null,
        meter_id: input.meterId ?? null,
        source: input.source,
        severity: input.severity,
        status: "open",
        title: input.title,
        description: input.description,
        detected_at: input.detectedAt,
        acknowledged_at: null,
        investigating_at: null,
        contained_at: null,
        monitoring_at: null,
        resolved_at: null,
        resolution_category: null,
        resolution_note: null,
        estimated_excess_water: input.estimatedExcessWater ?? null,
        estimated_excess_cost: input.estimatedExcessCost ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapLeakIncident(row);
  }

  async createLeakDetectionPolicy(
    input: Omit<LeakDetectionPolicy, "enabled" | "id"> & {
      enabled?: boolean;
    },
  ): Promise<LeakDetectionPolicy> {
    const row = await this.database.db
      .insertInto("leak_detection_policies")
      .values({
        id: await this.nextId(
          "leakDetectionPolicy",
          input.name,
          "leak_detection_policies",
        ),
        organization_id: input.organizationId,
        name: input.name,
        scope_type: input.scopeType,
        scope_id: input.scopeId ?? null,
        minimum_interval_usage: input.minimumIntervalUsage,
        minimum_consecutive_intervals: input.minimumConsecutiveIntervals,
        maximum_interval_gap_minutes: input.maximumIntervalGapMinutes,
        severity: input.severity,
        enabled: input.enabled ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapLeakDetectionPolicy(row);
  }

  async listLeakDetectionPolicies(input: {
    organizationId: string;
  }): Promise<LeakDetectionPolicy[]> {
    const rows = await this.database.db
      .selectFrom("leak_detection_policies")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .orderBy("name")
      .execute();
    return rows.map(mapLeakDetectionPolicy);
  }

  async findOpenLeakIncidentForPolicyMeter(input: {
    meterId: string;
    organizationId: string;
    policyId: string;
  }): Promise<LeakIncident | undefined> {
    const row = await this.database.db
      .selectFrom("incident_evidence")
      .innerJoin(
        "leak_incidents",
        "leak_incidents.id",
        "incident_evidence.incident_id",
      )
      .selectAll("leak_incidents")
      .where("incident_evidence.organization_id", "=", input.organizationId)
      .where("incident_evidence.policy_id", "=", input.policyId)
      .where("incident_evidence.meter_id", "=", input.meterId)
      .where("leak_incidents.status", "!=", "resolved")
      .orderBy("leak_incidents.detected_at", "desc")
      .executeTakeFirst();
    return row ? mapLeakIncident(row) : undefined;
  }

  async createIncidentEvidence(input: {
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
  }): Promise<IncidentEvidence> {
    const row = await this.database.db
      .insertInto("incident_evidence")
      .values({
        id: await this.nextId(
          "incidentEvidence",
          `${input.incidentId}-${input.windowEndedAt}`,
          "incident_evidence",
        ),
        organization_id: input.organizationId,
        incident_id: input.incidentId,
        policy_id: input.policyId,
        meter_id: input.meterId,
        reading_ids: JSON.stringify(input.readingIds),
        window_started_at: input.windowStartedAt,
        window_ended_at: input.windowEndedAt,
        observed_usage: input.observedUsage,
        threshold_usage: input.thresholdUsage,
        created_at: input.createdAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapIncidentEvidence(row);
  }

  async listIncidentEvidence(input: {
    incidentId: string;
    organizationId: string;
  }): Promise<IncidentEvidence[]> {
    const rows = await this.database.db
      .selectFrom("incident_evidence")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("incident_id", "=", input.incidentId)
      .orderBy("created_at")
      .execute();
    return rows.map(mapIncidentEvidence);
  }

  async createMoistureSensor(
    input: Omit<MoistureSensor, "id">,
  ): Promise<MoistureSensor> {
    const row = await this.database.db
      .insertInto("moisture_sensors")
      .values({
        id: await this.nextId(
          "moistureSensor",
          input.externalId,
          "moisture_sensors",
        ),
        organization_id: input.organizationId,
        building_id: input.buildingId,
        unit_id: input.unitId ?? null,
        external_id: input.externalId,
        name: input.name,
        source: input.source,
        status: input.status,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapMoistureSensor(row);
  }

  async listMoistureSensors(input: {
    buildingId?: string;
    organizationId: string;
  }): Promise<MoistureSensor[]> {
    let query = this.database.db
      .selectFrom("moisture_sensors")
      .selectAll()
      .where("organization_id", "=", input.organizationId);
    if (input.buildingId)
      query = query.where("building_id", "=", input.buildingId);
    return (await query.orderBy("name").execute()).map(mapMoistureSensor);
  }

  async findMoistureSensorById(
    organizationId: string,
    sensorId: string,
  ): Promise<MoistureSensor | undefined> {
    const row = await this.database.db
      .selectFrom("moisture_sensors")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", sensorId)
      .executeTakeFirst();
    return row ? mapMoistureSensor(row) : undefined;
  }

  async findMoistureSensorByExternalId(
    organizationId: string,
    externalId: string,
  ): Promise<MoistureSensor | undefined> {
    const row = await this.database.db
      .selectFrom("moisture_sensors")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("external_id", "=", externalId)
      .executeTakeFirst();
    return row ? mapMoistureSensor(row) : undefined;
  }

  async updateMoistureSensor(
    organizationId: string,
    sensorId: string,
    input: Partial<Pick<MoistureSensor, "name" | "status" | "updatedAt">>,
  ): Promise<MoistureSensor | undefined> {
    const row = await this.database.db
      .updateTable("moisture_sensors")
      .set(
        defined({
          name: input.name,
          status: input.status,
          updated_at: input.updatedAt,
        }),
      )
      .where("organization_id", "=", organizationId)
      .where("id", "=", sensorId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapMoistureSensor(row) : undefined;
  }

  async createMoistureSensorEvent(
    input: Omit<MoistureSensorEvent, "id">,
  ): Promise<{ created: boolean; event: MoistureSensorEvent }> {
    const row = await this.database.db
      .insertInto("moisture_sensor_events")
      .values({
        id: await this.nextId(
          "moistureSensorEvent",
          `${input.sensorId}-${input.measuredAt}`,
          "moisture_sensor_events",
        ),
        organization_id: input.organizationId,
        sensor_id: input.sensorId,
        state: input.state,
        measured_at: input.measuredAt,
        received_at: input.receivedAt,
      })
      .onConflict((conflict) =>
        conflict.columns(["sensor_id", "measured_at"]).doNothing(),
      )
      .returningAll()
      .executeTakeFirst();
    if (row) return { created: true, event: mapMoistureSensorEvent(row) };
    const existing = await this.database.db
      .selectFrom("moisture_sensor_events")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("sensor_id", "=", input.sensorId)
      .where("measured_at", "=", new Date(input.measuredAt))
      .executeTakeFirstOrThrow();
    return { created: false, event: mapMoistureSensorEvent(existing) };
  }

  async listMoistureSensorEvents(input: {
    organizationId: string;
    sensorId: string;
  }): Promise<MoistureSensorEvent[]> {
    const rows = await this.database.db
      .selectFrom("moisture_sensor_events")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("sensor_id", "=", input.sensorId)
      .orderBy("measured_at", "desc")
      .execute();
    return rows.map(mapMoistureSensorEvent);
  }

  async createIncidentSensorEvidence(input: {
    createdAt: string;
    incidentId: string;
    organizationId: string;
    sensorEventId: string;
    sensorId: string;
  }): Promise<IncidentSensorEvidence> {
    const row = await this.database.db
      .insertInto("incident_sensor_evidence")
      .values({
        id: await this.nextId(
          "incidentSensorEvidence",
          input.sensorEventId,
          "incident_sensor_evidence",
        ),
        organization_id: input.organizationId,
        incident_id: input.incidentId,
        sensor_id: input.sensorId,
        sensor_event_id: input.sensorEventId,
        created_at: input.createdAt,
      })
      .onConflict((conflict) => conflict.column("sensor_event_id").doNothing())
      .returningAll()
      .executeTakeFirst();
    if (row) return mapIncidentSensorEvidence(row);
    const existing = await this.database.db
      .selectFrom("incident_sensor_evidence")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("sensor_event_id", "=", input.sensorEventId)
      .executeTakeFirstOrThrow();
    return mapIncidentSensorEvidence(existing);
  }

  async listIncidentSensorEvidence(input: {
    incidentId: string;
    organizationId: string;
  }): Promise<IncidentSensorEvidence[]> {
    const rows = await this.database.db
      .selectFrom("incident_sensor_evidence")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("incident_id", "=", input.incidentId)
      .orderBy("created_at")
      .execute();
    return rows.map(mapIncidentSensorEvidence);
  }

  async findIncidentSensorEvidenceByEvent(
    organizationId: string,
    sensorEventId: string,
  ): Promise<IncidentSensorEvidence | undefined> {
    const row = await this.database.db
      .selectFrom("incident_sensor_evidence")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("sensor_event_id", "=", sensorEventId)
      .executeTakeFirst();
    return row ? mapIncidentSensorEvidence(row) : undefined;
  }

  async getIncidentCorrelationSettings(
    organizationId: string,
  ): Promise<IncidentCorrelationSettings> {
    const row = await this.database.db
      .selectFrom("incident_correlation_settings")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();
    return row
      ? mapIncidentCorrelationSettings(row)
      : {
          organizationId,
          moistureCorrelationWindowMinutes: 30,
          updatedAt: "2026-06-29T00:00:00.000Z",
        };
  }

  async upsertIncidentCorrelationSettings(
    input: IncidentCorrelationSettings,
  ): Promise<IncidentCorrelationSettings> {
    const row = await this.database.db
      .insertInto("incident_correlation_settings")
      .values({
        organization_id: input.organizationId,
        moisture_correlation_window_minutes:
          input.moistureCorrelationWindowMinutes,
        updated_at: input.updatedAt,
      })
      .onConflict((conflict) =>
        conflict.column("organization_id").doUpdateSet({
          moisture_correlation_window_minutes:
            input.moistureCorrelationWindowMinutes,
          updated_at: input.updatedAt,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapIncidentCorrelationSettings(row);
  }

  async getLeakBaselineSettings(
    organizationId: string,
  ): Promise<LeakBaselineSettings> {
    const row = await this.database.db
      .selectFrom("leak_baseline_settings")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();
    return row
      ? mapLeakBaselineSettings(row)
      : {
          organizationId,
          enabled: false,
          minimumValidDays: 14,
          thresholdMultiplier: 2,
          updatedAt: "2026-06-29T00:00:00.000Z",
        };
  }

  async upsertLeakBaselineSettings(
    input: LeakBaselineSettings,
  ): Promise<LeakBaselineSettings> {
    const row = await this.database.db
      .insertInto("leak_baseline_settings")
      .values({
        organization_id: input.organizationId,
        enabled: input.enabled,
        minimum_valid_days: input.minimumValidDays,
        threshold_multiplier: input.thresholdMultiplier,
        updated_at: input.updatedAt,
      })
      .onConflict((conflict) =>
        conflict.column("organization_id").doUpdateSet({
          enabled: input.enabled,
          minimum_valid_days: input.minimumValidDays,
          threshold_multiplier: input.thresholdMultiplier,
          updated_at: input.updatedAt,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapLeakBaselineSettings(row);
  }

  async listLeakIncidents(input: {
    buildingId?: string;
    organizationId: string;
    source?: LeakIncident["source"];
  }): Promise<LeakIncident[]> {
    let query = this.database.db
      .selectFrom("leak_incidents")
      .selectAll()
      .where("organization_id", "=", input.organizationId);
    if (input.buildingId) {
      query = query.where("building_id", "=", input.buildingId);
    }
    if (input.source) {
      query = query.where("source", "=", input.source);
    }
    const rows = await query.orderBy("detected_at", "desc").execute();
    return rows.map(mapLeakIncident);
  }

  async findLeakIncidentById(
    organizationId: string,
    incidentId: string,
  ): Promise<LeakIncident | undefined> {
    const row = await this.database.db
      .selectFrom("leak_incidents")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", incidentId)
      .executeTakeFirst();
    return row ? mapLeakIncident(row) : undefined;
  }

  async updateLeakIncident(
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
  ): Promise<LeakIncident | undefined> {
    const changes = defined({
      acknowledged_at: input.acknowledgedAt,
      contained_at: input.containedAt,
      investigating_at: input.investigatingAt,
      monitoring_at: input.monitoringAt,
      resolution_category: input.resolutionCategory,
      resolution_note: input.resolutionNote,
      resolved_at: input.resolvedAt,
      status: input.status,
    });
    if (!Object.keys(changes).length) {
      return this.findLeakIncidentById(organizationId, incidentId);
    }
    const row = await this.database.db
      .updateTable("leak_incidents")
      .set(changes)
      .where("organization_id", "=", organizationId)
      .where("id", "=", incidentId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapLeakIncident(row) : undefined;
  }

  async createIncidentActivity(input: {
    actorUserId?: string;
    createdAt: string;
    incidentId: string;
    organizationId: string;
    summary: string;
    type: IncidentActivity["type"];
  }): Promise<IncidentActivity> {
    const row = await this.database.db
      .insertInto("incident_activities")
      .values({
        id: await this.nextId(
          "incidentActivity",
          `${input.incidentId}-${input.type}`,
          "incident_activities",
        ),
        organization_id: input.organizationId,
        incident_id: input.incidentId,
        actor_user_id: input.actorUserId ?? null,
        type: input.type,
        summary: input.summary,
        created_at: input.createdAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapIncidentActivity(row);
  }

  async listIncidentActivities(input: {
    incidentId: string;
    organizationId: string;
  }): Promise<IncidentActivity[]> {
    const rows = await this.database.db
      .selectFrom("incident_activities")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("incident_id", "=", input.incidentId)
      .orderBy("created_at")
      .execute();
    return rows.map(mapIncidentActivity);
  }

  async getIncidentResponderSettings(
    organizationId: string,
  ): Promise<IncidentResponderSettings> {
    const row = await this.database.db
      .selectFrom("incident_responder_settings")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();
    return (
      (row && mapIncidentResponderSettings(row)) ?? {
        organizationId,
        emailEnabled: true,
        criticalAcknowledgementDeadlineMinutes: 15,
        warningAcknowledgementDeadlineMinutes: 60,
        updatedAt: "2026-06-29T00:00:00.000Z",
      }
    );
  }

  async upsertIncidentResponderSettings(input: {
    criticalAcknowledgementDeadlineMinutes: number;
    emailEnabled: boolean;
    organizationId: string;
    updatedAt: string;
    warningAcknowledgementDeadlineMinutes: number;
  }): Promise<IncidentResponderSettings> {
    const row = await this.database.db
      .insertInto("incident_responder_settings")
      .values({
        organization_id: input.organizationId,
        email_enabled: input.emailEnabled,
        critical_acknowledgement_deadline_minutes:
          input.criticalAcknowledgementDeadlineMinutes,
        warning_acknowledgement_deadline_minutes:
          input.warningAcknowledgementDeadlineMinutes,
        updated_at: input.updatedAt,
      })
      .onConflict((conflict) =>
        conflict.column("organization_id").doUpdateSet({
          email_enabled: input.emailEnabled,
          critical_acknowledgement_deadline_minutes:
            input.criticalAcknowledgementDeadlineMinutes,
          warning_acknowledgement_deadline_minutes:
            input.warningAcknowledgementDeadlineMinutes,
          updated_at: input.updatedAt,
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapIncidentResponderSettings(row);
  }

  async createIncidentNotification(input: {
    channel: IncidentNotification["channel"];
    createdAt: string;
    dedupeKey: string;
    emailOutboxId?: string;
    incidentId: string;
    kind: IncidentNotification["kind"];
    organizationId: string;
    recipientMembershipId: string;
    status: IncidentNotification["status"];
  }): Promise<{ created: boolean; notification: IncidentNotification }> {
    const row = await this.database.db
      .insertInto("incident_notifications")
      .values({
        id: await this.nextId(
          "incidentNotification",
          `${input.recipientMembershipId}-${input.dedupeKey}-${input.channel}`,
          "incident_notifications",
        ),
        organization_id: input.organizationId,
        incident_id: input.incidentId,
        recipient_membership_id: input.recipientMembershipId,
        channel: input.channel,
        kind: input.kind,
        status: input.status,
        dedupe_key: input.dedupeKey,
        email_outbox_id: input.emailOutboxId ?? null,
        created_at: input.createdAt,
        read_at: null,
      })
      .onConflict((conflict) =>
        conflict
          .columns([
            "organization_id",
            "recipient_membership_id",
            "channel",
            "dedupe_key",
          ])
          .doNothing(),
      )
      .returningAll()
      .executeTakeFirst();
    if (row) {
      return { created: true, notification: mapIncidentNotification(row) };
    }
    const existing = await this.database.db
      .selectFrom("incident_notifications")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("recipient_membership_id", "=", input.recipientMembershipId)
      .where("channel", "=", input.channel)
      .where("dedupe_key", "=", input.dedupeKey)
      .executeTakeFirstOrThrow();
    return { created: false, notification: mapIncidentNotification(existing) };
  }

  async listIncidentNotifications(input: {
    organizationId: string;
    recipientMembershipId: string;
  }): Promise<IncidentNotification[]> {
    const rows = await this.database.db
      .selectFrom("incident_notifications")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .where("recipient_membership_id", "=", input.recipientMembershipId)
      .where("channel", "=", "in_app")
      .orderBy("created_at", "desc")
      .execute();
    return rows.map(mapIncidentNotification);
  }

  async markIncidentNotificationRead(input: {
    notificationId: string;
    readAt: string;
    recipientMembershipId: string;
    organizationId: string;
  }): Promise<IncidentNotification | undefined> {
    const row = await this.database.db
      .updateTable("incident_notifications")
      .set({ read_at: input.readAt })
      .where("id", "=", input.notificationId)
      .where("organization_id", "=", input.organizationId)
      .where("recipient_membership_id", "=", input.recipientMembershipId)
      .where("channel", "=", "in_app")
      .returningAll()
      .executeTakeFirst();
    return row ? mapIncidentNotification(row) : undefined;
  }

  async createWorkOrder(input: {
    assignedMembershipId?: string;
    buildingId: string;
    createdAt: string;
    description: string;
    dueAt?: string;
    incidentId: string;
    organizationId: string;
    priority: WorkOrder["priority"];
    status: WorkOrder["status"];
    title: string;
    unitId?: string;
    updatedAt: string;
  }): Promise<WorkOrder> {
    const row = await this.database.db
      .insertInto("work_orders")
      .values({
        id: await this.nextId("workOrder", input.title, "work_orders"),
        organization_id: input.organizationId,
        incident_id: input.incidentId,
        building_id: input.buildingId,
        unit_id: input.unitId ?? null,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: input.status,
        assigned_membership_id: input.assignedMembershipId ?? null,
        due_at: input.dueAt ?? null,
        completion_note: null,
        completed_at: null,
        created_at: input.createdAt,
        updated_at: input.updatedAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapWorkOrder(row);
  }

  async listWorkOrders(input: {
    assignedMembershipId?: string;
    incidentId?: string;
    organizationId: string;
    overdue?: boolean;
    priority?: WorkOrder["priority"];
    status?: WorkOrder["status"];
  }): Promise<WorkOrder[]> {
    let query = this.database.db
      .selectFrom("work_orders")
      .selectAll()
      .where("organization_id", "=", input.organizationId);
    if (input.incidentId) {
      query = query.where("incident_id", "=", input.incidentId);
    }
    if (input.assignedMembershipId) {
      query = query.where(
        "assigned_membership_id",
        "=",
        input.assignedMembershipId,
      );
    }
    if (input.priority) {
      query = query.where("priority", "=", input.priority);
    }
    if (input.status) {
      query = query.where("status", "=", input.status);
    }
    if (input.overdue) {
      query = query
        .where("due_at", "is not", null)
        .where("due_at", "<", new Date())
        .where("status", "not in", ["completed", "cancelled"]);
    }
    const rows = await query.orderBy("created_at", "desc").execute();
    return rows.map(mapWorkOrder);
  }

  async findWorkOrderById(
    organizationId: string,
    workOrderId: string,
  ): Promise<WorkOrder | undefined> {
    const row = await this.database.db
      .selectFrom("work_orders")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", workOrderId)
      .executeTakeFirst();
    return row ? mapWorkOrder(row) : undefined;
  }

  async updateWorkOrder(
    organizationId: string,
    workOrderId: string,
    input: Partial<
      Pick<
        WorkOrder,
        | "assignedMembershipId"
        | "completedAt"
        | "completionNote"
        | "description"
        | "dueAt"
        | "priority"
        | "status"
        | "title"
        | "updatedAt"
      >
    >,
  ): Promise<WorkOrder | undefined> {
    const changes = defined({
      assigned_membership_id: input.assignedMembershipId,
      completed_at: input.completedAt,
      completion_note: input.completionNote,
      description: input.description,
      due_at: input.dueAt,
      priority: input.priority,
      status: input.status,
      title: input.title,
      updated_at: input.updatedAt,
    });
    if (!Object.keys(changes).length) {
      return this.findWorkOrderById(organizationId, workOrderId);
    }
    const row = await this.database.db
      .updateTable("work_orders")
      .set(changes)
      .where("organization_id", "=", organizationId)
      .where("id", "=", workOrderId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapWorkOrder(row) : undefined;
  }

  async listAlertRules(input: {
    organizationId: string;
  }): Promise<AlertRule[]> {
    const rows = await this.database.db
      .selectFrom("alert_rules")
      .selectAll()
      .where("organization_id", "=", input.organizationId)
      .orderBy("name")
      .execute();
    return rows.map(mapAlertRule);
  }

  async findAlertRuleById(
    organizationId: string,
    ruleId: string,
  ): Promise<AlertRule | undefined> {
    const row = await this.database.db
      .selectFrom("alert_rules")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", ruleId)
      .executeTakeFirst();
    return row ? mapAlertRule(row) : undefined;
  }

  async updateAlertRule(
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
  ): Promise<AlertRule | undefined> {
    const changes = defined({
      enabled: input.enabled,
      name: input.name,
      scope_id: input.scopeId,
      threshold: input.threshold,
      utility_type: input.utilityType,
      window_minutes: input.windowMinutes,
    });
    if (!Object.keys(changes).length) {
      return this.findAlertRuleById(organizationId, ruleId);
    }
    const row = await this.database.db
      .updateTable("alert_rules")
      .set(changes)
      .where("organization_id", "=", organizationId)
      .where("id", "=", ruleId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapAlertRule(row) : undefined;
  }

  async createAlertEvent(input: {
    message: string;
    organizationId: string;
    ruleId?: string;
    severity: AlertEvent["severity"];
    title: string;
    triggeredAt: string;
  }): Promise<AlertEvent> {
    const row = await this.database.db
      .insertInto("alert_events")
      .values({
        id: await this.nextId(
          "alertEvent",
          input.ruleId ?? input.title,
          "alert_events",
        ),
        organization_id: input.organizationId,
        rule_id: input.ruleId ?? null,
        severity: input.severity,
        status: "open",
        title: input.title,
        message: input.message,
        triggered_at: input.triggeredAt,
        acknowledged_at: null,
        resolved_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapAlertEvent(row);
  }

  async listAlertEvents(input: {
    organizationId: string;
    severity?: AlertEvent["severity"];
    status?: AlertEvent["status"];
  }): Promise<AlertEvent[]> {
    let query = this.database.db
      .selectFrom("alert_events")
      .selectAll()
      .where("organization_id", "=", input.organizationId);
    if (input.status) {
      query = query.where("status", "=", input.status);
    }
    if (input.severity) {
      query = query.where("severity", "=", input.severity);
    }
    const rows = await query.orderBy("triggered_at", "desc").execute();
    return rows.map(mapAlertEvent);
  }

  async findAlertEventById(
    organizationId: string,
    alertId: string,
  ): Promise<AlertEvent | undefined> {
    const row = await this.database.db
      .selectFrom("alert_events")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("id", "=", alertId)
      .executeTakeFirst();
    return row ? mapAlertEvent(row) : undefined;
  }

  async findOpenAlertForRule(
    organizationId: string,
    ruleId: string,
  ): Promise<AlertEvent | undefined> {
    const row = await this.database.db
      .selectFrom("alert_events")
      .selectAll()
      .where("organization_id", "=", organizationId)
      .where("rule_id", "=", ruleId)
      .where("status", "!=", "resolved")
      .executeTakeFirst();
    return row ? mapAlertEvent(row) : undefined;
  }

  async updateAlertEvent(
    organizationId: string,
    alertId: string,
    input: Partial<
      Pick<AlertEvent, "acknowledgedAt" | "resolvedAt" | "status">
    >,
  ): Promise<AlertEvent | undefined> {
    const changes = defined({
      acknowledged_at: input.acknowledgedAt,
      resolved_at: input.resolvedAt,
      status: input.status,
    });
    if (!Object.keys(changes).length) {
      return this.findAlertEventById(organizationId, alertId);
    }
    const row = await this.database.db
      .updateTable("alert_events")
      .set(changes)
      .where("organization_id", "=", organizationId)
      .where("id", "=", alertId)
      .returningAll()
      .executeTakeFirst();
    return row ? mapAlertEvent(row) : undefined;
  }

  async resetDemoData(organizationId: string): Promise<void> {
    const db = this.database.db;
    const demoBuildings = await db
      .selectFrom("buildings")
      .select("id")
      .where("organization_id", "=", organizationId)
      .where("name", "like", "Demo %")
      .execute();
    const buildingIds = demoBuildings.map((row) => row.id);

    const demoMeters = await db
      .selectFrom("meters")
      .select("id")
      .where("organization_id", "=", organizationId)
      .where((eb) =>
        eb.or([
          eb("external_id", "like", "demo-%"),
          buildingIds.length > 0
            ? eb("building_id", "in", buildingIds)
            : eb.val(false),
        ]),
      )
      .execute();
    const meterIds = demoMeters.map((row) => row.id);

    const demoRules = await db
      .selectFrom("alert_rules")
      .select("id")
      .where("organization_id", "=", organizationId)
      .where("name", "like", "Demo %")
      .execute();
    const ruleIds = demoRules.map((row) => row.id);

    await db.transaction().execute(async (trx) => {
      if (ruleIds.length > 0) {
        await trx
          .deleteFrom("alert_events")
          .where("organization_id", "=", organizationId)
          .where("rule_id", "in", ruleIds)
          .execute();
        await trx
          .deleteFrom("alert_rules")
          .where("organization_id", "=", organizationId)
          .where("id", "in", ruleIds)
          .execute();
      }

      if (meterIds.length > 0) {
        await trx
          .deleteFrom("usage_aggregates")
          .where("organization_id", "=", organizationId)
          .where("meter_id", "in", meterIds)
          .execute();
        await trx
          .deleteFrom("meter_readings")
          .where("organization_id", "=", organizationId)
          .where("meter_id", "in", meterIds)
          .execute();
        await trx
          .deleteFrom("meters")
          .where("organization_id", "=", organizationId)
          .where("id", "in", meterIds)
          .execute();
      }

      if (buildingIds.length > 0) {
        await trx
          .deleteFrom("units")
          .where("organization_id", "=", organizationId)
          .where("building_id", "in", buildingIds)
          .execute();
        await trx
          .deleteFrom("floors")
          .where("organization_id", "=", organizationId)
          .where("building_id", "in", buildingIds)
          .execute();
        await trx
          .deleteFrom("buildings")
          .where("organization_id", "=", organizationId)
          .where("id", "in", buildingIds)
          .execute();
      }
    });
  }

  private bootstrapUser(
    id: string,
    email: string,
    name: string,
  ): Insertable<UserRow> {
    return {
      id,
      email,
      name,
      password_hash: createPasswordHash("password123"),
      created_at: "2026-06-29T00:00:00.000Z",
    };
  }

  private async nextId(
    kind: string,
    seed: string,
    tableName: keyof import("../database/schema").DatabaseSchema,
  ): Promise<string> {
    const prefix = `${kind}_${slug(seed) || "item"}`;
    const result = await sql<{ count: string }>`
      SELECT count(*)::text AS count
      FROM ${sql.table(tableName)}
      WHERE id LIKE ${`${prefix}_%`}
    `.execute(this.database.db);
    const count = Number(result.rows[0]?.count ?? "0") + 1;
    return `${prefix}_${count}`;
  }
}

function mapOrganization(row: Selectable<OrganizationRow>): Organization {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: iso(row.created_at),
  };
}

function mapUser(row: Selectable<UserRow>): StoredUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: iso(row.created_at),
  };
}

function mapMembership(row: Selectable<MembershipRow>): Membership {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
  };
}

function mapInvitation(row: Selectable<InvitationRow>): StoredInvitation {
  return defined({
    id: row.id,
    tokenHash: row.token_hash,
    organizationId: row.organization_id,
    inviterUserId: row.inviter_user_id,
    email: row.email,
    role: row.role,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    acceptedAt: row.accepted_at ? iso(row.accepted_at) : undefined,
    revokedAt: row.revoked_at ? iso(row.revoked_at) : undefined,
  }) as StoredInvitation;
}

function mapAuditLog(row: Selectable<AuditLogRow>): StoredAuditLog {
  return {
    action: row.action,
    actorUserId: row.actor_user_id ?? undefined,
    createdAt: iso(row.created_at),
    id: row.id,
    metadata: parseJsonObject(row.metadata),
    organizationId: row.organization_id,
    targetId: row.target_id,
    targetType: row.target_type,
  };
}

function mapSession(row: Selectable<SessionRow>): StoredSession {
  return defined({
    id: row.id,
    tokenHash: row.token_hash,
    userId: row.user_id,
    organizationId: row.organization_id,
    membershipId: row.membership_id,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    revokedAt: row.revoked_at ? iso(row.revoked_at) : undefined,
    userAgent: row.user_agent ?? undefined,
    ipAddress: row.ip_address ?? undefined,
  }) as StoredSession;
}

function mapPasswordResetToken(
  row: Selectable<PasswordResetTokenRow>,
): StoredPasswordResetToken {
  return defined({
    id: row.id,
    tokenHash: row.token_hash,
    userId: row.user_id,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    usedAt: row.used_at ? iso(row.used_at) : undefined,
    requestedIp: row.requested_ip ?? undefined,
    userAgent: row.user_agent ?? undefined,
  }) as StoredPasswordResetToken;
}

function mapEmailOutboxItem(
  row: Selectable<EmailOutboxRow>,
): StoredEmailOutboxItem {
  return defined({
    id: row.id,
    to: row.to_email,
    subject: row.subject,
    textBody: row.text_body,
    htmlBody: row.html_body ?? undefined,
    status: row.status,
    createdAt: iso(row.created_at),
    dedupeKey: row.dedupe_key ?? undefined,
    sentAt: row.sent_at ? iso(row.sent_at) : undefined,
  }) as StoredEmailOutboxItem;
}

function mapIncidentResponderSettings(
  row: Selectable<IncidentResponderSettingsRow>,
): IncidentResponderSettings {
  return {
    organizationId: row.organization_id,
    emailEnabled: row.email_enabled,
    criticalAcknowledgementDeadlineMinutes:
      row.critical_acknowledgement_deadline_minutes,
    warningAcknowledgementDeadlineMinutes:
      row.warning_acknowledgement_deadline_minutes,
    updatedAt: iso(row.updated_at),
  };
}

function mapIncidentNotification(
  row: Selectable<IncidentNotificationRow>,
): IncidentNotification {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    incidentId: row.incident_id,
    recipientMembershipId: row.recipient_membership_id,
    channel: row.channel,
    kind: row.kind,
    status: row.status,
    dedupeKey: row.dedupe_key,
    emailOutboxId: row.email_outbox_id ?? undefined,
    createdAt: iso(row.created_at),
    readAt: row.read_at ? iso(row.read_at) : undefined,
  }) as IncidentNotification;
}

function mapUtilityRates(
  row: Selectable<OrganizationUtilityRatesRow>,
): UtilityRatesResponse {
  return {
    electricPerKwh: Number(row.electric_per_kwh),
    organizationId: row.organization_id,
    updatedAt: iso(row.updated_at),
    waterPerGallon: Number(row.water_per_gallon),
  };
}

function mapBuilding(row: Selectable<BuildingRow>): Building {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    address: row.address ?? undefined,
    timezone: row.timezone,
    lifecycleStatus: row.lifecycle_status,
    archivedAt: row.archived_at ? iso(row.archived_at) : undefined,
  }) as Building;
}

function mapFloor(row: Selectable<FloorRow>): Floor {
  return {
    id: row.id,
    organizationId: row.organization_id,
    buildingId: row.building_id,
    name: row.name,
    level: row.level,
    lifecycleStatus: row.lifecycle_status,
    archivedAt: row.archived_at ? iso(row.archived_at) : undefined,
  };
}

function mapLeakIncident(row: Selectable<LeakIncidentRow>): LeakIncident {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    buildingId: row.building_id,
    unitId: row.unit_id ?? undefined,
    meterId: row.meter_id ?? undefined,
    source: row.source,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    detectedAt: iso(row.detected_at),
    acknowledgedAt: row.acknowledged_at ? iso(row.acknowledged_at) : undefined,
    investigatingAt: row.investigating_at
      ? iso(row.investigating_at)
      : undefined,
    containedAt: row.contained_at ? iso(row.contained_at) : undefined,
    monitoringAt: row.monitoring_at ? iso(row.monitoring_at) : undefined,
    resolvedAt: row.resolved_at ? iso(row.resolved_at) : undefined,
    resolutionCategory: row.resolution_category ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
    estimatedExcessWater:
      row.estimated_excess_water === null
        ? undefined
        : Number(row.estimated_excess_water),
    estimatedExcessCost:
      row.estimated_excess_cost === null
        ? undefined
        : Number(row.estimated_excess_cost),
  }) as LeakIncident;
}

function mapLeakDetectionPolicy(
  row: Selectable<LeakDetectionPolicyRow>,
): LeakDetectionPolicy {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    scopeType: row.scope_type,
    scopeId: row.scope_id ?? undefined,
    minimumIntervalUsage: Number(row.minimum_interval_usage),
    minimumConsecutiveIntervals: row.minimum_consecutive_intervals,
    maximumIntervalGapMinutes: row.maximum_interval_gap_minutes,
    severity: row.severity,
    enabled: row.enabled,
  }) as LeakDetectionPolicy;
}

function mapIncidentEvidence(
  row: Selectable<IncidentEvidenceRow>,
): IncidentEvidence {
  return {
    id: row.id,
    organizationId: row.organization_id,
    incidentId: row.incident_id,
    policyId: row.policy_id ?? undefined,
    meterId: row.meter_id,
    readingIds: parseJsonArray(row.reading_ids),
    windowStartedAt: iso(row.window_started_at),
    windowEndedAt: iso(row.window_ended_at),
    observedUsage: Number(row.observed_usage),
    thresholdUsage: Number(row.threshold_usage),
    createdAt: iso(row.created_at),
  };
}

function mapMoistureSensor(row: Selectable<MoistureSensorRow>): MoistureSensor {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    buildingId: row.building_id,
    unitId: row.unit_id ?? undefined,
    externalId: row.external_id,
    name: row.name,
    source: row.source,
    status: row.status,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }) as MoistureSensor;
}

function mapMoistureSensorEvent(
  row: Selectable<MoistureSensorEventRow>,
): MoistureSensorEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sensorId: row.sensor_id,
    state: row.state,
    measuredAt: iso(row.measured_at),
    receivedAt: iso(row.received_at),
  };
}

function mapIncidentSensorEvidence(
  row: Selectable<IncidentSensorEvidenceRow>,
): IncidentSensorEvidence {
  return {
    id: row.id,
    organizationId: row.organization_id,
    incidentId: row.incident_id,
    sensorId: row.sensor_id,
    sensorEventId: row.sensor_event_id,
    createdAt: iso(row.created_at),
  };
}

function mapIncidentCorrelationSettings(
  row: Selectable<IncidentCorrelationSettingsRow>,
): IncidentCorrelationSettings {
  return {
    organizationId: row.organization_id,
    moistureCorrelationWindowMinutes: row.moisture_correlation_window_minutes,
    updatedAt: iso(row.updated_at),
  };
}

function mapLeakBaselineSettings(
  row: Selectable<LeakBaselineSettingsRow>,
): LeakBaselineSettings {
  return {
    organizationId: row.organization_id,
    enabled: row.enabled,
    minimumValidDays: row.minimum_valid_days,
    thresholdMultiplier: Number(row.threshold_multiplier),
    updatedAt: iso(row.updated_at),
  };
}

function mapIncidentActivity(
  row: Selectable<IncidentActivityRow>,
): IncidentActivity {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    incidentId: row.incident_id,
    actorUserId: row.actor_user_id ?? undefined,
    type: row.type,
    summary: row.summary,
    createdAt: iso(row.created_at),
  }) as IncidentActivity;
}

function mapWorkOrder(row: Selectable<WorkOrderRow>): WorkOrder {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    incidentId: row.incident_id,
    buildingId: row.building_id,
    unitId: row.unit_id ?? undefined,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedMembershipId: row.assigned_membership_id ?? undefined,
    dueAt: row.due_at ? iso(row.due_at) : undefined,
    completionNote: row.completion_note ?? undefined,
    completedAt: row.completed_at ? iso(row.completed_at) : undefined,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }) as WorkOrder;
}

function mapUnit(row: Selectable<UnitRow>): Unit {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    buildingId: row.building_id,
    floorId: row.floor_id ?? undefined,
    name: row.name,
    occupancyStatus: row.occupancy_status,
    lifecycleStatus: row.lifecycle_status,
    archivedAt: row.archived_at ? iso(row.archived_at) : undefined,
  }) as Unit;
}

function mapMeter(row: Selectable<MeterRow>): Meter {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    buildingId: row.building_id,
    floorId: row.floor_id ?? undefined,
    unitId: row.unit_id ?? undefined,
    utilityType: row.utility_type,
    source: row.source,
    externalId: row.external_id,
    status: row.status,
    installedAt: row.installed_at ? iso(row.installed_at) : undefined,
    lastReadingAt: row.last_reading_at ? iso(row.last_reading_at) : undefined,
    lifecycleStatus: row.lifecycle_status,
    archivedAt: row.archived_at ? iso(row.archived_at) : undefined,
  }) as Meter;
}

function mapReading(row: Selectable<MeterReadingRow>): MeterReading {
  return {
    id: row.id,
    organizationId: row.organization_id,
    meterId: row.meter_id,
    measuredAt: iso(row.measured_at),
    utilityType: row.utility_type,
    value: Number(row.value),
    unit: row.unit,
    readingKind: row.reading_kind,
    quality: row.quality,
    receivedAt: iso(row.received_at),
  };
}

function mapUsageAggregate(row: Selectable<UsageAggregateRow>): UsageAggregate {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    meterId: row.meter_id,
    buildingId: row.building_id,
    unitId: row.unit_id ?? undefined,
    utilityType: row.utility_type,
    periodStart: iso(row.period_start),
    periodEnd: iso(row.period_end),
    periodType: row.period_type,
    usageValue: Number(row.usage_value),
    costEstimate:
      row.cost_estimate === null ? undefined : Number(row.cost_estimate),
  }) as UsageAggregate;
}

function mapAlertRule(row: Selectable<AlertRuleRow>): AlertRule {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    utilityType: row.utility_type ?? undefined,
    scopeType: row.scope_type,
    scopeId: row.scope_id ?? undefined,
    conditionType: row.condition_type,
    threshold: row.threshold === null ? undefined : Number(row.threshold),
    windowMinutes: row.window_minutes,
    enabled: row.enabled,
  }) as AlertRule;
}

function mapAlertEvent(row: Selectable<AlertEventRow>): AlertEvent {
  return defined({
    id: row.id,
    organizationId: row.organization_id,
    ruleId: row.rule_id ?? undefined,
    severity: row.severity,
    status: row.status,
    title: row.title,
    message: row.message,
    triggeredAt: iso(row.triggered_at),
    acknowledgedAt: row.acknowledged_at ? iso(row.acknowledged_at) : undefined,
    resolvedAt: row.resolved_at ? iso(row.resolved_at) : undefined,
  }) as AlertEvent;
}

function iso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function slug(seed: string): string {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

function defined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
