import type { WorkOrderStatus } from "@iot-management/types";

export type WorkOrderActivityType =
  | "work_order_assigned"
  | "work_order_started"
  | "work_order_completed"
  | "work_order_cancelled";

export interface WorkOrderTransitionDefinition {
  activityType: WorkOrderActivityType;
  from: WorkOrderStatus;
  summary: string;
}

const transitions: Partial<
  Record<WorkOrderStatus, WorkOrderTransitionDefinition>
> = {
  assigned: {
    activityType: "work_order_assigned",
    from: "open",
    summary: "Work order assigned",
  },
  in_progress: {
    activityType: "work_order_started",
    from: "assigned",
    summary: "Repair work started",
  },
  completed: {
    activityType: "work_order_completed",
    from: "in_progress",
    summary: "Repair work completed",
  },
  cancelled: {
    activityType: "work_order_cancelled",
    from: "open",
    summary: "Work order cancelled",
  },
};

export function getWorkOrderTransition(
  currentStatus: WorkOrderStatus,
  targetStatus: WorkOrderStatus,
): WorkOrderTransitionDefinition | undefined {
  const transition = transitions[targetStatus];
  if (!transition) {
    return undefined;
  }
  if (targetStatus === "cancelled") {
    return ["open", "assigned", "in_progress"].includes(currentStatus)
      ? transition
      : undefined;
  }
  return transition.from === currentStatus ? transition : undefined;
}
