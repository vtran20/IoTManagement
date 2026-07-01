import type {
  AlertEvent,
  AlertRule,
  Building,
  Floor,
  Membership,
  Meter,
  MeterReading,
  Organization,
  Unit,
  UsageAggregate,
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
  MembershipRow,
  MeterReadingRow,
  MeterRow,
  OrganizationRow,
  PasswordResetTokenRow,
  SessionRow,
  UnitRow,
  UsageAggregateRow,
  UserRow,
} from "../database/schema";
import { validateApiEnv } from "../config/env.schema";
import type {
  PersistenceService,
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
        sent_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return mapEmailOutboxItem(row);
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
        id: await this.nextId("reading", input.meterId, "meter_readings"),
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
        id: await this.nextId(
          "usageAggregate",
          input.meterId,
          "usage_aggregates",
        ),
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
    sentAt: row.sent_at ? iso(row.sent_at) : undefined,
  }) as StoredEmailOutboxItem;
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
