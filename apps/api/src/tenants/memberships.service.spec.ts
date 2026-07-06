import { describe, expect, it } from "vitest";
import type { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { MembershipsService } from "./memberships.service";

const northOwnerContext: RequestContext = {
  membership: {
    id: "membership_north_owner",
    organizationId: "org_north",
    role: "owner",
    status: "active",
    userId: "user_north_owner",
  },
  organization: {
    createdAt: "2026-06-29T00:00:00.000Z",
    id: "org_north",
    name: "North Properties",
    status: "active",
  },
  user: {
    createdAt: "2026-06-29T00:00:00.000Z",
    email: "owner@north.example",
    id: "user_north_owner",
    name: "North Owner",
  },
};

describe("MembershipsService", () => {
  it("prevents a manager from creating an owner or manager membership", async () => {
    const persistence = new InMemoryPersistenceService();
    const service = new MembershipsService(persistence);
    const managerContext: RequestContext = {
      ...northOwnerContext,
      membership: {
        id: "membership_north_manager",
        organizationId: "org_north",
        role: "manager",
        status: "active",
        userId: "user_north_manager",
      },
      user: {
        createdAt: "2026-06-29T00:00:00.000Z",
        email: "manager@north.example",
        id: "user_north_manager",
        name: "North Manager",
      },
    };

    await expect(
      service.create(managerContext, {
        email: "new-owner@north.example",
        role: "owner",
      }),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_ROLE_FORBIDDEN",
      statusCode: 403,
    });

    await expect(
      service.create(managerContext, {
        email: "new-manager@north.example",
        role: "manager",
      }),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_ROLE_FORBIDDEN",
      statusCode: 403,
    });
  });

  it("does not allow the final active owner to be demoted", async () => {
    const service = new MembershipsService(new InMemoryPersistenceService());

    await expect(
      service.updateRole(northOwnerContext, "membership_north_owner", {
        role: "manager",
      }),
    ).rejects.toMatchObject({
      code: "LAST_OWNER_REQUIRED",
      statusCode: 400,
    });
  });

  it("does not reveal a membership from another organization", async () => {
    const service = new MembershipsService(new InMemoryPersistenceService());

    await expect(
      service.disable(northOwnerContext, "membership_south_owner"),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_NOT_FOUND",
      statusCode: 404,
    });
  });
});
