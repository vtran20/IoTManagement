import { describe, expect, it } from "vitest";
import { resolveWorkOrderAssignment } from "./work-order-assignment";

describe("resolveWorkOrderAssignment", () => {
  it("accepts one external vendor assignment and moves open work to assigned", () => {
    expect(
      resolveWorkOrderAssignment({
        assignedMembershipId: undefined,
        assignedVendorId: "vendor-plumbing",
        currentStatus: "open",
      }),
    ).toEqual({
      assignedMembershipId: undefined,
      assignedVendorId: "vendor-plumbing",
      status: "assigned",
    });
  });

  it("rejects assigning both an internal member and a vendor", () => {
    expect(() =>
      resolveWorkOrderAssignment({
        assignedMembershipId: "membership-manager",
        assignedVendorId: "vendor-plumbing",
        currentStatus: "open",
      }),
    ).toThrow("exactly one assignment target");
  });
});
