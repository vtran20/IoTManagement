import type {
  AlertEvent,
  DashboardOperationItem,
  DashboardOperationsResponse,
  DeviceHealthResponse,
  LeakIncident,
  WorkOrder,
} from "@iot-management/types";

const activeWorkOrderStatuses = new Set<WorkOrder["status"]>([
  "open",
  "assigned",
  "in_progress",
]);

const priorityRanks: Record<WorkOrder["priority"], number> = {
  critical: 0,
  high: 1,
  low: 3,
  medium: 2,
};

const severityRanks: Record<AlertEvent["severity"], number> = {
  critical: 0,
  info: 2,
  warning: 1,
};

export function buildDashboardOperations(input: {
  alerts: AlertEvent[];
  deviceHealth: DeviceHealthResponse;
  incidents: LeakIncident[];
  now: string;
  organizationId: string;
  workOrders: WorkOrder[];
}): DashboardOperationsResponse {
  const activeWorkOrders = input.workOrders.filter(
    (workOrder) =>
      workOrder.organizationId === input.organizationId &&
      activeWorkOrderStatuses.has(workOrder.status),
  );
  const overdueWorkOrders = activeWorkOrders.filter((workOrder) =>
    isOverdue(workOrder, input.now),
  );
  const activeWorkOrderIncidentIds = new Set(
    activeWorkOrders.map((workOrder) => workOrder.incidentId),
  );
  const unrepairedIncidents = input.incidents.filter(
    (incident) =>
      incident.organizationId === input.organizationId &&
      incident.status !== "resolved" &&
      !activeWorkOrderIncidentIds.has(incident.id),
  );
  const openAlerts = input.alerts.filter(
    (alert) =>
      alert.organizationId === input.organizationId && alert.status === "open",
  );
  const queueEntries: QueueEntry[] = [
    ...activeWorkOrders
      .filter(
        (workOrder) =>
          isOverdue(workOrder, input.now) || workOrder.priority === "critical",
      )
      .map((workOrder) => workOrderEntry(workOrder, input.now)),
    ...unrepairedIncidents.map(incidentEntry),
    ...openAlerts.filter((alert) => !alert.incidentId).map(alertEntry),
    ...input.deviceHealth.meters
      .filter((meter) => meter.status === "offline")
      .map(meterEntry),
  ];

  queueEntries.sort(compareQueueEntries);

  return {
    criticalAlertCount: openAlerts.filter(
      (alert) => alert.severity === "critical",
    ).length,
    generatedAt: input.now,
    incidentsWithoutRepairCount: unrepairedIncidents.length,
    items: queueEntries.slice(0, 8).map((entry) => entry.item),
    offlineMeterCount: input.deviceHealth.meters.filter(
      (meter) => meter.status === "offline",
    ).length,
    organizationId: input.organizationId,
    overdueWorkOrderCount: overdueWorkOrders.length,
  };
}

interface QueueEntry {
  item: DashboardOperationItem;
  rank: number;
  severityOrPriorityRank: number;
  timestamp: number;
}

function workOrderEntry(workOrder: WorkOrder, now: string): QueueEntry {
  const overdue = isOverdue(workOrder, now);
  return {
    item: {
      actionLabel: "Review repair",
      assignmentType: assignmentTypeFor(workOrder),
      dueAt: workOrder.dueAt,
      href: `/work-orders/${workOrder.id}`,
      id: workOrder.id,
      isOverdue: overdue,
      kind: "work_order",
      priority: workOrder.priority,
      status: workOrder.status,
      supportingText: workOrder.description,
      title: workOrder.title,
    },
    rank: overdue ? 0 : 1,
    severityOrPriorityRank: priorityRanks[workOrder.priority],
    timestamp: timestampFor(workOrder.dueAt, Number.MAX_SAFE_INTEGER),
  };
}

function incidentEntry(incident: LeakIncident): QueueEntry {
  return {
    item: {
      actionLabel: "Open incident",
      detectedAt: incident.detectedAt,
      href: `/incidents/${incident.id}`,
      id: incident.id,
      kind: "incident",
      severity: incident.severity,
      status: incident.status,
      supportingText: incident.description,
      title: incident.title,
    },
    rank: 2,
    severityOrPriorityRank: severityRanks[incident.severity],
    timestamp: timestampFor(incident.detectedAt, Number.MAX_SAFE_INTEGER),
  };
}

function alertEntry(alert: AlertEvent): QueueEntry {
  return {
    item: {
      actionLabel: "Review alert",
      detectedAt: alert.triggeredAt,
      href: "/alerts",
      id: alert.id,
      kind: "alert",
      severity: alert.severity,
      status: alert.status,
      supportingText: alert.message,
      title: alert.title,
    },
    rank: 3,
    severityOrPriorityRank: severityRanks[alert.severity],
    timestamp: timestampFor(alert.triggeredAt, Number.MAX_SAFE_INTEGER),
  };
}

function meterEntry(meter: DeviceHealthResponse["meters"][number]): QueueEntry {
  return {
    item: {
      actionLabel: "Inspect meter",
      detectedAt: meter.lastReadingAt,
      href: `/meters/${meter.meterId}`,
      id: meter.meterId,
      kind: "meter",
      status: meter.status,
      supportingText: meter.externalId,
      title: `${meter.externalId} is offline`,
    },
    rank: 4,
    severityOrPriorityRank: 0,
    timestamp: timestampFor(meter.lastReadingAt, Number.NEGATIVE_INFINITY),
  };
}

function assignmentTypeFor(
  workOrder: WorkOrder,
): "internal" | "unassigned" | "vendor" {
  if (workOrder.assignedVendorId) return "vendor";
  if (workOrder.assignedMembershipId) return "internal";
  return "unassigned";
}

function compareQueueEntries(left: QueueEntry, right: QueueEntry): number {
  return (
    left.rank - right.rank ||
    left.severityOrPriorityRank - right.severityOrPriorityRank ||
    left.timestamp - right.timestamp ||
    left.item.id.localeCompare(right.item.id)
  );
}

function isOverdue(workOrder: WorkOrder, now: string): boolean {
  if (
    !["assigned", "in_progress"].includes(workOrder.status) ||
    !workOrder.dueAt
  ) {
    return false;
  }
  const dueAt = Date.parse(workOrder.dueAt);
  const currentTime = Date.parse(now);
  return (
    Number.isFinite(dueAt) &&
    Number.isFinite(currentTime) &&
    dueAt < currentTime
  );
}

function timestampFor(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : fallback;
}
