import { describe, expect, it } from "vitest";
import type { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { LeakDetectionPoliciesService } from "./leak-detection-policies.service";

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

describe("LeakDetectionPoliciesService", () => {
  it("rejects unsafe continuous-flow thresholds", async () => {
    const service = new LeakDetectionPoliciesService(
      new InMemoryPersistenceService(),
    );

    await expect(
      service.create(ownerContext, {
        enabled: true,
        maximumIntervalGapMinutes: 0,
        minimumConsecutiveIntervals: 1,
        minimumIntervalUsage: -0.1,
        name: "Invalid policy",
        scopeType: "organization",
        severity: "warning",
      }),
    ).rejects.toMatchObject({ code: "INVALID_LEAK_DETECTION_POLICY" });
  });

  it("rejects organization-wide policies that supply a resource scope", async () => {
    const service = new LeakDetectionPoliciesService(
      new InMemoryPersistenceService(),
    );

    await expect(
      service.create(ownerContext, {
        enabled: true,
        maximumIntervalGapMinutes: 20,
        minimumConsecutiveIntervals: 3,
        minimumIntervalUsage: 0.5,
        name: "Invalid organization scope",
        scopeId: "building_south",
        scopeType: "organization",
        severity: "warning",
      }),
    ).rejects.toMatchObject({ code: "INVALID_LEAK_DETECTION_SCOPE" });
  });
});
