import type {
  AlertEvent,
  DashboardOperationsResponse,
  DeviceHealthResponse,
  LeakIncident,
  WorkOrder,
} from "@iot-management/types";
import { describe, expect, it } from "vitest";
import { buildDashboardOperations } from "./dashboard-operations";

describe("buildDashboardOperations", () => {
  it("returns zero operational counts when the organization has no operations", () => {
    const result: DashboardOperationsResponse = buildDashboardOperations({
      alerts: [] as AlertEvent[],
      deviceHealth: { meters: [] } as DeviceHealthResponse,
      incidents: [] as LeakIncident[],
      now: "2026-07-05T12:00:00.000Z",
      organizationId: "org_north",
      workOrders: [] as WorkOrder[],
    });

    expect(result).toEqual({
      criticalAlertCount: 0,
      generatedAt: "2026-07-05T12:00:00.000Z",
      incidentsWithoutRepairCount: 0,
      items: [],
      offlineMeterCount: 0,
      organizationId: "org_north",
      overdueWorkOrderCount: 0,
    });
  });

  it("prioritizes repair work and omits duplicates from linked alerts", () => {
    const result = buildDashboardOperations({
      alerts: [
        {
          id: "alert_linked",
          incidentId: "incident_repair",
          message: "A repair is already in progress.",
          organizationId: "org_north",
          severity: "critical",
          status: "open",
          title: "Leak suspected",
          triggeredAt: "2026-07-05T08:00:00.000Z",
        },
        {
          id: "alert_unlinked",
          message: "Water use is higher than expected.",
          organizationId: "org_north",
          severity: "warning",
          status: "open",
          title: "High water use",
          triggeredAt: "2026-07-05T09:00:00.000Z",
        },
      ] satisfies AlertEvent[],
      deviceHealth: {
        meters: [
          {
            externalId: "north-main-water",
            lastReadingAt: "2026-07-04T12:00:00.000Z",
            meterId: "meter_offline",
            status: "offline",
            utilityType: "water",
          },
          {
            externalId: "north-lobby-water",
            meterId: "meter_stale",
            status: "stale",
            utilityType: "water",
          },
        ],
      } satisfies DeviceHealthResponse,
      incidents: [
        incident({
          id: "incident_repair",
          severity: "critical",
          title: "Boiler room leak",
        }),
        incident({
          id: "incident_unrepaired",
          severity: "critical",
          title: "Hallway leak",
        }),
        incident({
          id: "incident_resolved",
          status: "resolved",
          title: "Resolved leak",
        }),
      ],
      now: "2026-07-05T12:00:00.000Z",
      organizationId: "org_north",
      workOrders: [
        workOrder({
          dueAt: "2026-07-05T10:00:00.000Z",
          id: "work_order_overdue",
          incidentId: "incident_repair",
          priority: "critical",
          status: "assigned",
          title: "Repair boiler room leak",
        }),
        workOrder({
          id: "work_order_completed",
          incidentId: "incident_resolved",
          status: "completed",
        }),
      ],
    });

    expect(result).toMatchObject({
      criticalAlertCount: 1,
      incidentsWithoutRepairCount: 1,
      offlineMeterCount: 1,
      overdueWorkOrderCount: 1,
    });
    expect(result.items.map((item) => item.kind)).toEqual([
      "work_order",
      "incident",
      "alert",
      "meter",
    ]);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionLabel: "Review repair",
          href: "/work-orders/work_order_overdue",
          id: "work_order_overdue",
          isOverdue: true,
        }),
        expect.objectContaining({
          actionLabel: "Open incident",
          href: "/incidents/incident_unrepaired",
          id: "incident_unrepaired",
        }),
        expect.objectContaining({
          actionLabel: "Review alert",
          href: "/alerts",
          id: "alert_unlinked",
        }),
        expect.objectContaining({
          actionLabel: "Inspect meter",
          href: "/meters/meter_offline",
          id: "meter_offline",
        }),
      ]),
    );
    expect(
      result.items.find((item) => item.id === "alert_linked"),
    ).toBeUndefined();
  });
});

function incident(
  input: Partial<LeakIncident> & Pick<LeakIncident, "id">,
): LeakIncident {
  const { id, ...overrides } = input;
  return {
    buildingId: "building_north",
    description: "Water response required.",
    detectedAt: "2026-07-05T07:00:00.000Z",
    id,
    organizationId: "org_north",
    severity: "warning",
    source: "manual_report",
    status: "investigating",
    title: "Water incident",
    ...overrides,
  };
}

function workOrder(
  input: Partial<WorkOrder> & Pick<WorkOrder, "id" | "incidentId">,
): WorkOrder {
  const { id, incidentId, ...overrides } = input;
  return {
    buildingId: "building_north",
    createdAt: "2026-07-05T07:30:00.000Z",
    description: "Repair water leak.",
    id,
    incidentId,
    organizationId: "org_north",
    priority: "medium",
    status: "open",
    title: "Repair water leak",
    updatedAt: "2026-07-05T07:30:00.000Z",
    ...overrides,
  };
}
