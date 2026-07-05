import { Inject, Injectable } from "@nestjs/common";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class WorkOrderOverdueService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async process(input: {
    workOrderId: string;
    organizationId: string;
  }): Promise<void> {
    const workOrder = await this.persistence.findWorkOrderById(
      input.organizationId,
      input.workOrderId,
    );
    if (
      !workOrder ||
      !workOrder.dueAt ||
      ["completed", "cancelled"].includes(workOrder.status) ||
      new Date(workOrder.dueAt).getTime() > Date.now()
    )
      return;
    const memberships = await this.persistence.listMemberships(
      input.organizationId,
    );
    const now = new Date().toISOString();
    await Promise.all(
      memberships
        .filter(
          (membership) =>
            membership.status === "active" &&
            (membership.role === "owner" || membership.role === "manager"),
        )
        .map((membership) =>
          this.persistence.createWorkOrderNotification({
            organizationId: input.organizationId,
            workOrderId: workOrder.id,
            recipientMembershipId: membership.id,
            kind: "work_order_overdue",
            status: "delivered",
            createdAt: now,
            dedupeKey: `${workOrder.id}:work_order_overdue:${workOrder.dueAt}`,
          }),
        ),
    );
  }
}
