import type {
  Membership,
  Organization,
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
}
