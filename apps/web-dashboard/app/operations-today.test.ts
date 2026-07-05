import type { DashboardOperationItem } from "@iot-management/types";
import { describe, expect, it } from "vitest";
import {
  operationAssignmentLabel,
  operationWhenLabel,
} from "../features/dashboard/operations-today";

describe("Operations Today labels", () => {
  it("makes overdue repair timing and vendor assignment explicit", () => {
    const workOrder = {
      actionLabel: "Review repair",
      assignmentType: "vendor",
      dueAt: "2026-07-05T10:00:00.000Z",
      href: "/work-orders/work_order_overdue",
      id: "work_order_overdue",
      isOverdue: true,
      kind: "work_order",
      priority: "critical",
      status: "assigned",
      title: "Repair boiler room leak",
    } satisfies DashboardOperationItem;

    expect(operationAssignmentLabel(workOrder)).toBe("Vendor");
    expect(operationWhenLabel(workOrder)).toMatch(/^Overdue /);
  });

  it("uses detected time and a neutral assignment marker for alerts", () => {
    const alert = {
      actionLabel: "Review alert",
      detectedAt: "2026-07-05T09:00:00.000Z",
      href: "/alerts",
      id: "alert_unlinked",
      kind: "alert",
      severity: "warning",
      status: "open",
      title: "High water use",
    } satisfies DashboardOperationItem;

    expect(operationAssignmentLabel(alert)).toBe("-");
    expect(operationWhenLabel(alert)).toMatch(/^Detected /);
  });
});
