import type {
  LeakIncident,
  LeakIncidentResponse,
  ListLeakIncidentsQuery,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import { IncidentNotificationsService } from "../notifications/incident-notifications.service";
import { CreateManualLeakIncidentDto } from "./dto/create-manual-leak-incident.dto";
import { CreateIncidentNoteDto } from "./dto/create-incident-note.dto";
import { ResolveLeakIncidentDto } from "./dto/resolve-leak-incident.dto";
import {
  getIncidentTransition,
  IncidentTransitionTarget,
} from "./incident-lifecycle";

@Injectable()
export class LeakIncidentsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(IncidentNotificationsService)
    private readonly notifications: IncidentNotificationsService,
  ) {}

  async createManual(
    context: RequestContext,
    dto: CreateManualLeakIncidentDto,
  ): Promise<LeakIncidentResponse> {
    const building = await this.persistence.findBuildingById(
      context.organization.id,
      dto.buildingId,
    );
    if (!building) {
      throw tenantResourceNotFound("Building");
    }
    if (dto.unitId) {
      const unit = await this.persistence.findUnitById(
        context.organization.id,
        dto.unitId,
      );
      if (!unit || unit.buildingId !== building.id) {
        throw tenantResourceNotFound("Unit");
      }
    }
    if (dto.meterId) {
      const meter = await this.persistence.findMeterById(
        context.organization.id,
        dto.meterId,
      );
      if (
        !meter ||
        meter.buildingId !== building.id ||
        (dto.unitId && meter.unitId && meter.unitId !== dto.unitId)
      ) {
        throw tenantResourceNotFound("Meter");
      }
    }

    const incident = await this.persistence.createLeakIncident({
      buildingId: building.id,
      description: dto.description,
      detectedAt: new Date().toISOString(),
      meterId: dto.meterId,
      organizationId: context.organization.id,
      severity: dto.severity,
      source: "manual_report",
      title: dto.title,
      unitId: dto.unitId,
    });
    await this.persistence.createAuditLog({
      action: "leak_incident.created",
      actorUserId: context.user.id,
      metadata: { source: incident.source },
      organizationId: context.organization.id,
      targetId: incident.id,
      targetType: "leak_incident",
    });
    await this.persistence.createIncidentActivity({
      actorUserId: context.user.id,
      createdAt: incident.detectedAt,
      incidentId: incident.id,
      organizationId: context.organization.id,
      summary: "Manual incident opened",
      type: "opened",
    });
    await this.notifications.notifyIncidentOpened(incident);
    return incident;
  }

  async list(context: RequestContext, query: ListLeakIncidentsQuery = {}) {
    return {
      items: await this.persistence.listLeakIncidents({
        buildingId: query.buildingId,
        organizationId: context.organization.id,
        source: query.source,
      }),
    };
  }

  async acknowledge(context: RequestContext, incidentId: string) {
    return await this.transition(context, incidentId, "acknowledged");
  }

  async investigate(context: RequestContext, incidentId: string) {
    return await this.transition(context, incidentId, "investigating");
  }

  async contain(context: RequestContext, incidentId: string) {
    return await this.transition(context, incidentId, "contained");
  }

  async monitor(context: RequestContext, incidentId: string) {
    return await this.transition(context, incidentId, "monitoring");
  }

  async resolve(
    context: RequestContext,
    incidentId: string,
    dto: ResolveLeakIncidentDto,
  ) {
    if (!dto.resolutionNote?.trim()) {
      throw new ApiError(
        "RESOLUTION_NOTE_REQUIRED",
        "A resolution note is required before resolving an incident",
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.transition(context, incidentId, "resolved", dto);
  }

  async addNote(
    context: RequestContext,
    incidentId: string,
    dto: CreateIncidentNoteDto,
  ) {
    const incident = await this.persistence.findLeakIncidentById(
      context.organization.id,
      incidentId,
    );
    if (!incident) {
      throw tenantResourceNotFound("Leak incident");
    }
    const summary = dto.note?.trim();
    if (!summary) {
      throw new ApiError(
        "INCIDENT_NOTE_REQUIRED",
        "An incident note cannot be empty",
        HttpStatus.BAD_REQUEST,
      );
    }
    const activity = await this.persistence.createIncidentActivity({
      actorUserId: context.user.id,
      createdAt: new Date().toISOString(),
      incidentId,
      organizationId: context.organization.id,
      summary,
      type: "note",
    });
    await this.persistence.createAuditLog({
      action: "leak_incident.note_added",
      actorUserId: context.user.id,
      metadata: {},
      organizationId: context.organization.id,
      targetId: incidentId,
      targetType: "leak_incident",
    });
    return activity;
  }

  async get(context: RequestContext, incidentId: string) {
    const incident = await this.persistence.findLeakIncidentById(
      context.organization.id,
      incidentId,
    );
    if (!incident) {
      throw tenantResourceNotFound("Leak incident");
    }
    const [activities, evidence, sensorEvidence, workOrders] =
      await Promise.all([
        this.persistence.listIncidentActivities({
          incidentId,
          organizationId: context.organization.id,
        }),
        this.persistence.listIncidentEvidence({
          incidentId,
          organizationId: context.organization.id,
        }),
        this.persistence.listIncidentSensorEvidence({
          incidentId,
          organizationId: context.organization.id,
        }),
        this.persistence.listWorkOrders({
          incidentId,
          organizationId: context.organization.id,
        }),
      ]);
    return { ...incident, activities, evidence, sensorEvidence, workOrders };
  }

  private async transition(
    context: RequestContext,
    incidentId: string,
    targetStatus: IncidentTransitionTarget,
    resolution?: ResolveLeakIncidentDto,
  ) {
    const incident = await this.persistence.findLeakIncidentById(
      context.organization.id,
      incidentId,
    );
    if (!incident) {
      throw tenantResourceNotFound("Leak incident");
    }
    const definition = getIncidentTransition(incident.status, targetStatus);
    if (!definition) {
      throw new ApiError(
        "INVALID_INCIDENT_TRANSITION",
        `Incident cannot transition from ${incident.status} to ${targetStatus}`,
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date().toISOString();
    const updated = await this.persistence.updateLeakIncident(
      context.organization.id,
      incidentId,
      {
        [definition.timestampField]: now,
        status: targetStatus,
        ...(targetStatus === "resolved"
          ? {
              resolutionCategory: resolution!.resolutionCategory,
              resolutionNote: resolution!.resolutionNote!.trim(),
            }
          : {}),
      },
    );
    await this.persistence.createIncidentActivity({
      actorUserId: context.user.id,
      createdAt: now,
      incidentId,
      organizationId: context.organization.id,
      summary: definition.summary,
      type: targetStatus,
    });
    await this.persistence.createAuditLog({
      action: `leak_incident.${targetStatus}`,
      actorUserId: context.user.id,
      metadata: {},
      organizationId: context.organization.id,
      targetId: incidentId,
      targetType: "leak_incident",
    });
    return updated!;
  }
}
