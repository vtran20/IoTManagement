import { describe, expect, it } from "vitest";
import type { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { MetersService } from "./meters.service";

const ownerContext: RequestContext = {
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

describe("MetersService", () => {
  it("archives a meter without deleting its inventory record", async () => {
    const persistence = new InMemoryPersistenceService();
    const meter = persistence.createMeter({
      buildingId: "building_north_test",
      externalId: "archive-water-meter",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    const service = new MetersService(persistence);

    const archived = await service.archive(ownerContext, meter.id);

    expect(archived).toMatchObject({
      id: meter.id,
      lifecycleStatus: "archived",
      status: "disabled",
    });
    expect(archived.archivedAt).toEqual(expect.any(String));
    expect(persistence.findMeterById("org_north", meter.id)).toMatchObject({
      lifecycleStatus: "archived",
    });
  });
});
