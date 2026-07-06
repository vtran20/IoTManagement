import { describe, expect, it, vi } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { WorkOrderOverdueQueueService } from "../jobs/queues";
import { WorkOrdersService } from "./work-orders.service";

describe("WorkOrdersService", () => {
  it("completes an in-progress work order with a note and no final cost", async () => {
    const persistence = new InMemoryPersistenceService();
    const overdueQueue = {
      schedule: vi.fn(),
    } as unknown as WorkOrderOverdueQueueService;
    const service = new WorkOrdersService(persistence, overdueQueue);
    const workOrder = persistence.createWorkOrder({
      assignedMembershipId: "membership_north_manager",
      buildingId: "building_north_1",
      createdAt: "2026-07-01T00:00:00.000Z",
      description: "Repair the valve.",
      incidentId: "incident-test",
      organizationId: "org_north",
      priority: "high",
      status: "in_progress",
      title: "Valve repair",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });

    const result = await service.update(
      {
        membership: {
          id: "membership_north_owner",
          organizationId: "org_north",
          role: "owner",
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
      },
      workOrder.id,
      {
        completionNote:
          "Replaced the failed washer and confirmed the drip stopped.",
        status: "completed",
      },
    );

    expect(result).toMatchObject({
      completionNote:
        "Replaced the failed washer and confirmed the drip stopped.",
      status: "completed",
    });
    expect(result).not.toHaveProperty("finalCost");
    expect(result.completedAt).toEqual(expect.any(String));
  });
});
