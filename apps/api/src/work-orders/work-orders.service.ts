import type {
  CreateWorkOrderRequest,
  ListWorkOrdersQuery,
  WorkOrder,
  WorkOrderResponse,
} from "@iot-management/types";
import { workOrderPriorities, workOrderStatuses } from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { UpdateWorkOrderDto } from "./dto/update-work-order.dto";
import { getWorkOrderTransition } from "./work-order-lifecycle";

@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(
    context: RequestContext,
    incidentId: string,
    dto: CreateWorkOrderRequest,
  ): Promise<WorkOrderResponse> {
    const incident = await this.persistence.findLeakIncidentById(
      context.organization.id,
      incidentId,
    );
    if (!incident) {
      throw tenantResourceNotFound("Leak incident");
    }
    if (incident.status === "resolved") {
      throw new ApiError(
        "INCIDENT_ALREADY_RESOLVED",
        "A resolved incident cannot receive a new work order",
        HttpStatus.CONFLICT,
      );
    }

    const title = this.requireText(dto.title, "WORK_ORDER_TITLE_REQUIRED");
    const description = this.requireText(
      dto.description,
      "WORK_ORDER_DESCRIPTION_REQUIRED",
    );
    const assignedMembership = dto.assignedMembershipId
      ? await this.findAssignableMembership(
          context.organization.id,
          dto.assignedMembershipId,
        )
      : undefined;
    const now = new Date().toISOString();
    const workOrder = await this.persistence.createWorkOrder({
      assignedMembershipId: assignedMembership?.id,
      buildingId: incident.buildingId,
      createdAt: now,
      description,
      dueAt: this.normalizeDate(dto.dueAt),
      incidentId: incident.id,
      organizationId: context.organization.id,
      priority: this.validatePriority(dto.priority),
      status: assignedMembership ? "assigned" : "open",
      title,
      unitId: incident.unitId,
      updatedAt: now,
    });
    await this.persistence.createIncidentActivity({
      actorUserId: context.user.id,
      createdAt: now,
      incidentId: incident.id,
      organizationId: context.organization.id,
      summary: `Work order created: ${workOrder.title}`,
      type: "work_order_created",
    });
    if (assignedMembership) {
      await this.persistence.createIncidentActivity({
        actorUserId: context.user.id,
        createdAt: now,
        incidentId: incident.id,
        organizationId: context.organization.id,
        summary: `Work order assigned to ${assignedMembership.id}`,
        type: "work_order_assigned",
      });
    }
    await this.persistence.createAuditLog({
      action: "work_order.created",
      actorUserId: context.user.id,
      metadata: { incidentId: incident.id, priority: workOrder.priority },
      organizationId: context.organization.id,
      targetId: workOrder.id,
      targetType: "work_order",
    });
    return this.withOverdue(workOrder);
  }

  async list(context: RequestContext, query: ListWorkOrdersQuery = {}) {
    const items = await this.persistence.listWorkOrders({
      assignedMembershipId: query.assignedMembershipId,
      incidentId: query.incidentId,
      organizationId: context.organization.id,
      overdue: this.normalizeOverdue(query.overdue),
      priority: query.priority,
      status: query.status,
    });
    return { items: items.map((item) => this.withOverdue(item)) };
  }

  async get(
    context: RequestContext,
    workOrderId: string,
  ): Promise<WorkOrderResponse> {
    const workOrder = await this.persistence.findWorkOrderById(
      context.organization.id,
      workOrderId,
    );
    if (!workOrder) {
      throw tenantResourceNotFound("Work order");
    }
    return this.withOverdue(workOrder);
  }

  async update(
    context: RequestContext,
    workOrderId: string,
    dto: UpdateWorkOrderDto,
  ): Promise<WorkOrderResponse> {
    const existing = await this.persistence.findWorkOrderById(
      context.organization.id,
      workOrderId,
    );
    if (!existing) {
      throw tenantResourceNotFound("Work order");
    }

    const assignedMembership = dto.assignedMembershipId
      ? await this.findAssignableMembership(
          context.organization.id,
          dto.assignedMembershipId,
        )
      : undefined;
    const title =
      dto.title === undefined
        ? undefined
        : this.requireText(dto.title, "WORK_ORDER_TITLE_REQUIRED");
    const description =
      dto.description === undefined
        ? undefined
        : this.requireText(dto.description, "WORK_ORDER_DESCRIPTION_REQUIRED");
    const dueAt =
      dto.dueAt === undefined ? undefined : this.normalizeDate(dto.dueAt);
    const priority =
      dto.priority === undefined
        ? undefined
        : this.validatePriority(dto.priority);
    let status =
      dto.status === undefined
        ? existing.status
        : this.validateStatus(dto.status);
    if (assignedMembership && dto.status === undefined && status === "open") {
      status = "assigned";
    }
    if (
      status === "assigned" &&
      !(assignedMembership ?? existing.assignedMembershipId)
    ) {
      throw new ApiError(
        "WORK_ORDER_ASSIGNEE_REQUIRED",
        "An assigned work order needs an active owner or manager assignee",
        HttpStatus.BAD_REQUEST,
      );
    }

    const transition =
      status === existing.status
        ? undefined
        : getWorkOrderTransition(existing.status, status);
    if (status !== existing.status && !transition) {
      throw new ApiError(
        "INVALID_WORK_ORDER_TRANSITION",
        `Work order cannot transition from ${existing.status} to ${status}`,
        HttpStatus.CONFLICT,
      );
    }
    const completionNote =
      dto.completionNote === undefined
        ? undefined
        : this.requireText(
            dto.completionNote,
            "WORK_ORDER_COMPLETION_NOTE_REQUIRED",
          );
    if (status === "completed" && !completionNote) {
      throw new ApiError(
        "WORK_ORDER_COMPLETION_NOTE_REQUIRED",
        "A completion note is required before completing a work order",
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date().toISOString();
    const updated = await this.persistence.updateWorkOrder(
      context.organization.id,
      existing.id,
      {
        ...(assignedMembership
          ? { assignedMembershipId: assignedMembership.id }
          : {}),
        ...(completionNote ? { completionNote } : {}),
        ...(description ? { description } : {}),
        ...(dueAt ? { dueAt } : {}),
        ...(priority ? { priority } : {}),
        ...(status !== existing.status ? { status } : {}),
        ...(title ? { title } : {}),
        ...(status === "completed" ? { completedAt: now } : {}),
        updatedAt: now,
      },
    );
    const workOrder = updated!;
    await this.recordUpdateActivity({
      assignedMembershipId: assignedMembership?.id,
      context,
      dueAt,
      detailsChanged:
        title !== undefined ||
        description !== undefined ||
        dto.priority !== undefined,
      existing,
      status,
      transition,
      workOrder,
    });
    await this.persistence.createAuditLog({
      action: "work_order.updated",
      actorUserId: context.user.id,
      metadata: { fields: Object.keys(dto), status: workOrder.status },
      organizationId: context.organization.id,
      targetId: workOrder.id,
      targetType: "work_order",
    });
    return this.withOverdue(workOrder);
  }

  private async recordUpdateActivity(input: {
    assignedMembershipId?: string;
    context: RequestContext;
    detailsChanged: boolean;
    dueAt?: string;
    existing: WorkOrder;
    status: WorkOrder["status"];
    transition?: ReturnType<typeof getWorkOrderTransition>;
    workOrder: WorkOrder;
  }): Promise<void> {
    const { context, existing, workOrder } = input;
    const now = workOrder.updatedAt;
    if (
      input.assignedMembershipId &&
      input.assignedMembershipId !== existing.assignedMembershipId
    ) {
      await this.createTimelineActivity(
        context,
        workOrder,
        "work_order_assigned",
        `Work order assigned to ${input.assignedMembershipId}`,
        now,
      );
    }
    if (input.dueAt && input.dueAt !== existing.dueAt) {
      await this.createTimelineActivity(
        context,
        workOrder,
        "work_order_due_date_changed",
        `Work order due date set to ${input.dueAt}`,
        now,
      );
    }
    if (input.transition) {
      await this.createTimelineActivity(
        context,
        workOrder,
        input.transition.activityType,
        input.transition.summary,
        now,
      );
    }
    if (input.detailsChanged) {
      await this.createTimelineActivity(
        context,
        workOrder,
        "work_order_updated",
        "Work order details updated",
        now,
      );
    }
  }

  private async createTimelineActivity(
    context: RequestContext,
    workOrder: WorkOrder,
    type:
      | "work_order_assigned"
      | "work_order_due_date_changed"
      | "work_order_started"
      | "work_order_completed"
      | "work_order_cancelled"
      | "work_order_updated",
    summary: string,
    createdAt: string,
  ): Promise<void> {
    await this.persistence.createIncidentActivity({
      actorUserId: context.user.id,
      createdAt,
      incidentId: workOrder.incidentId,
      organizationId: context.organization.id,
      summary,
      type,
    });
  }

  private async findAssignableMembership(
    organizationId: string,
    membershipId: string,
  ) {
    const membership = await this.persistence.findMembershipByOrganizationAndId(
      organizationId,
      membershipId,
    );
    if (
      !membership ||
      membership.status !== "active" ||
      !["owner", "manager"].includes(membership.role)
    ) {
      throw new ApiError(
        "WORK_ORDER_ASSIGNEE_INVALID",
        "Work orders can only be assigned to active owners or managers",
        HttpStatus.BAD_REQUEST,
      );
    }
    return membership;
  }

  private normalizeDate(value: unknown): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== "string" || !value.trim()) {
      throw new ApiError(
        "WORK_ORDER_DUE_DATE_INVALID",
        "The work order dueAt value must be a valid ISO date-time",
        HttpStatus.BAD_REQUEST,
      );
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(
        "WORK_ORDER_DUE_DATE_INVALID",
        "The work order dueAt value must be a valid ISO date-time",
        HttpStatus.BAD_REQUEST,
      );
    }
    return date.toISOString();
  }

  private requireText(value: unknown, code: string): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
      throw new ApiError(
        code,
        "A non-empty value is required",
        HttpStatus.BAD_REQUEST,
      );
    }
    return normalized;
  }

  private validatePriority(value: unknown): WorkOrder["priority"] {
    if (!workOrderPriorities.includes(value as WorkOrder["priority"])) {
      throw new ApiError(
        "WORK_ORDER_PRIORITY_INVALID",
        "The work order priority is not supported",
        HttpStatus.BAD_REQUEST,
      );
    }
    return value as WorkOrder["priority"];
  }

  private validateStatus(value: unknown): WorkOrder["status"] {
    if (!workOrderStatuses.includes(value as WorkOrder["status"])) {
      throw new ApiError(
        "WORK_ORDER_STATUS_INVALID",
        "The work order status is not supported",
        HttpStatus.BAD_REQUEST,
      );
    }
    return value as WorkOrder["status"];
  }

  private normalizeOverdue(value: unknown): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === true || value === "true") {
      return true;
    }
    if (value === false || value === "false") {
      return false;
    }
    throw new ApiError(
      "WORK_ORDER_OVERDUE_FILTER_INVALID",
      "The overdue filter must be true or false",
      HttpStatus.BAD_REQUEST,
    );
  }

  private withOverdue(workOrder: WorkOrder): WorkOrderResponse {
    return {
      ...workOrder,
      isOverdue:
        !!workOrder.dueAt &&
        new Date(workOrder.dueAt).getTime() < Date.now() &&
        !["completed", "cancelled"].includes(workOrder.status),
    };
  }
}
