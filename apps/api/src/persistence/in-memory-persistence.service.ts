import type {
  Building,
  Floor,
  Membership,
  Meter,
  Organization,
  Unit,
  User,
  UserRole,
} from "@iot-management/types";
import { Injectable } from "@nestjs/common";
import { createPasswordHash } from "../auth/password";

export interface StoredUser extends User {
  passwordHash: string;
}

@Injectable()
export class InMemoryPersistenceService {
  private counters = {
    building: 1,
    floor: 1,
    meter: 1,
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

  private readonly users: StoredUser[] = [
    this.createUser("user_north_owner", "owner@north.example", "North Owner"),
    this.createUser(
      "user_north_manager",
      "manager@north.example",
      "North Manager",
    ),
    this.createUser(
      "user_north_viewer",
      "viewer@north.example",
      "North Viewer",
    ),
    this.createUser("user_south_owner", "owner@south.example", "South Owner"),
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
    },
  ];

  private readonly floors: Floor[] = [
    {
      id: "floor_south_1",
      organizationId: "org_south",
      buildingId: "building_south",
      name: "Level 1",
      level: 1,
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
    },
  ];

  private readonly meters: Meter[] = [];

  findUserByEmail(email: string): StoredUser | undefined {
    return this.users.find((user) => user.email === email.toLowerCase());
  }

  findUserById(userId: string): StoredUser | undefined {
    return this.users.find((user) => user.id === userId);
  }

  findPrimaryMembershipForUser(userId: string): Membership | undefined {
    return this.memberships.find((membership) => membership.userId === userId);
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
    const user = this.createUser(userId, input.email, input.email);
    this.users.push(user);

    const membership = this.createMembership(
      `membership_${userId}`,
      input.organizationId,
      user.id,
      input.role,
    );
    this.memberships.push(membership);
    return membership;
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
    input: Partial<Pick<Building, "address" | "name" | "timezone">>,
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
    input: Partial<Pick<Floor, "level" | "name">>,
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
    input: Partial<Pick<Unit, "floorId" | "name" | "occupancyStatus">>,
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
    };
    this.meters.push(meter);
    return meter;
  }

  updateMeter(
    organizationId: string,
    meterId: string,
    input: Partial<
      Pick<Meter, "floorId" | "installedAt" | "status" | "unitId">
    >,
  ): Meter | undefined {
    const meter = this.findMeterById(organizationId, meterId);
    if (!meter) {
      return undefined;
    }
    Object.assign(meter, input);
    return meter;
  }

  private createUser(id: string, email: string, name: string): StoredUser {
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
