import type {
  AlertEvent,
  AlertEventResponse,
  AlertIncidentSummary,
  LeakIncident,
  ListAlertsQuery,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { StructuredLogger } from "../common/logging/logger";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import {
  AlertEvaluatorService,
  EvaluateAlertsResponse,
} from "./alert-evaluator.service";

@Injectable()
export class AlertEventsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(AlertEvaluatorService)
    private readonly evaluator: AlertEvaluatorService,
    @Inject(StructuredLogger)
    private readonly logger: StructuredLogger,
  ) {}

  async list(context: RequestContext, query: ListAlertsQuery = {}) {
    const [alerts, incidents] = await Promise.all([
      this.persistence.listAlertEvents({
        organizationId: context.organization.id,
        severity: query.severity,
        status: query.status,
      }),
      this.persistence.listLeakIncidents({
        organizationId: context.organization.id,
      }),
    ]);
    const incidentsById = new Map(
      incidents.map((incident) => [incident.id, incident]),
    );
    return {
      items: alerts.map((alert) => this.enrich(alert, incidentsById)),
    };
  }

  async evaluate(
    context: RequestContext,
    input: { now?: string } = {},
  ): Promise<EvaluateAlertsResponse> {
    return await this.evaluator.evaluate({
      now: input.now,
      organizationId: context.organization.id,
    });
  }

  async acknowledge(context: RequestContext, alertId: string) {
    const event = await this.persistence.updateAlertEvent(
      context.organization.id,
      alertId,
      {
        acknowledgedAt: new Date().toISOString(),
        status: "acknowledged",
      },
    );
    if (!event) {
      throw tenantResourceNotFound("Alert");
    }
    await this.auditLifecycle(context, alertId, "alert.acknowledged");
    this.logLifecycle(context, alertId, "acknowledged");
    return event;
  }

  async resolve(context: RequestContext, alertId: string) {
    const event = await this.persistence.updateAlertEvent(
      context.organization.id,
      alertId,
      {
        resolvedAt: new Date().toISOString(),
        status: "resolved",
      },
    );
    if (!event) {
      throw tenantResourceNotFound("Alert");
    }
    await this.auditLifecycle(context, alertId, "alert.resolved");
    this.logLifecycle(context, alertId, "resolved");
    return event;
  }

  async linkToIncident(
    context: RequestContext,
    alertId: string,
    incidentId: string,
  ): Promise<AlertEventResponse> {
    const [alert, incident] = await Promise.all([
      this.persistence.findAlertEventById(context.organization.id, alertId),
      this.persistence.findLeakIncidentById(
        context.organization.id,
        incidentId,
      ),
    ]);
    if (!alert) throw tenantResourceNotFound("Alert");
    if (!incident) throw tenantResourceNotFound("Leak incident");
    if (alert.incidentId) {
      throw new ApiError(
        "ALERT_ALREADY_LINKED",
        "This alert is already linked to an incident",
        HttpStatus.CONFLICT,
      );
    }
    if (incident.status === "resolved") {
      throw new ApiError(
        "INCIDENT_ALREADY_RESOLVED",
        "A resolved incident cannot receive a new alert link",
        HttpStatus.CONFLICT,
      );
    }
    const linked = await this.persistence.linkAlertToIncident({
      alertId,
      incidentId,
      organizationId: context.organization.id,
    });
    if (!linked) {
      throw new ApiError(
        "ALERT_ALREADY_LINKED",
        "This alert is already linked to an incident",
        HttpStatus.CONFLICT,
      );
    }
    await this.persistence.createAuditLog({
      action: "alert.linked_to_incident",
      actorUserId: context.user.id,
      metadata: { incidentId },
      organizationId: context.organization.id,
      targetId: alertId,
      targetType: "alert_event",
    });
    return this.enrich(linked, new Map([[incident.id, incident]]));
  }

  private enrich(
    alert: AlertEvent,
    incidents: Map<string, LeakIncident>,
  ): AlertEventResponse {
    const incident = alert.incidentId
      ? incidents.get(alert.incidentId)
      : undefined;
    const summary: AlertIncidentSummary | undefined = incident
      ? { id: incident.id, status: incident.status, title: incident.title }
      : undefined;
    return {
      ...alert,
      incident: summary,
    };
  }

  private async auditLifecycle(
    context: RequestContext,
    alertId: string,
    action: "alert.acknowledged" | "alert.resolved",
  ) {
    await this.persistence.createAuditLog({
      action,
      actorUserId: context.user.id,
      metadata: {},
      organizationId: context.organization.id,
      targetId: alertId,
      targetType: "alert_event",
    });
  }

  private logLifecycle(
    context: RequestContext,
    alertId: string,
    action: "acknowledged" | "resolved",
  ) {
    this.logger.info("Alert lifecycle changed", {
      action,
      alertId,
      event: "alert.lifecycle",
      organizationId: context.organization.id,
      userId: context.user.id,
    });
  }
}
