import { describe, expect, it } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { WorkOrderOverdueService } from "./work-order-overdue.service";

describe("WorkOrderOverdueService", () => {
  it("notifies each active owner and manager once for an overdue assigned order", async () => {
    const persistence = new InMemoryPersistenceService();
    const workOrder = persistence.createWorkOrder({
      assignedMembershipId: "membership_north_manager",
      buildingId: "building_north_1",
      createdAt: "2026-07-01T00:00:00.000Z",
      description: "Repair the valve.",
      dueAt: "2026-07-01T01:00:00.000Z",
      incidentId: "incident-test",
      organizationId: "org_north",
      priority: "high",
      status: "assigned",
      title: "Valve repair",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });
    const service = new WorkOrderOverdueService(persistence);

    await service.process({
      organizationId: "org_north",
      workOrderId: workOrder.id,
    });
    await service.process({
      organizationId: "org_north",
      workOrderId: workOrder.id,
    });

    expect(
      persistence.listWorkOrderNotifications({
        organizationId: "org_north",
        recipientMembershipId: "membership_north_owner",
      }),
    ).toHaveLength(1);
    expect(
      persistence.listWorkOrderNotifications({
        organizationId: "org_north",
        recipientMembershipId: "membership_north_manager",
      }),
    ).toHaveLength(1);
    expect(
      persistence.listWorkOrderNotifications({
        organizationId: "org_north",
        recipientMembershipId: "membership_north_viewer",
      }),
    ).toHaveLength(0);
  });
});
