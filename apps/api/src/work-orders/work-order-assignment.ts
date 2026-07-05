import type { WorkOrder } from "@iot-management/types";

export function resolveWorkOrderAssignment(input: {
  assignedMembershipId?: string;
  assignedVendorId?: string;
  currentStatus: WorkOrder["status"];
}): Pick<WorkOrder, "assignedMembershipId" | "assignedVendorId" | "status"> {
  if (input.assignedMembershipId && input.assignedVendorId) {
    throw new Error("A work order must have exactly one assignment target");
  }
  const hasAssignment = !!(
    input.assignedMembershipId || input.assignedVendorId
  );
  return {
    assignedMembershipId: input.assignedMembershipId,
    assignedVendorId: input.assignedVendorId,
    status:
      hasAssignment && input.currentStatus === "open"
        ? "assigned"
        : input.currentStatus,
  };
}
