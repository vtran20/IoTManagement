import type { ListAlertsQuery } from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import { StructuredLogger } from "../common/logging/logger";
import { RequestContext } from "../common/request-context";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";
import {
  AlertEvaluatorService,
  EvaluateAlertsResponse,
} from "./alert-evaluator.service";

@Injectable()
export class AlertEventsService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
    @Inject(AlertEvaluatorService)
    private readonly evaluator: AlertEvaluatorService,
    @Inject(StructuredLogger)
    private readonly logger: StructuredLogger,
  ) {}

  list(context: RequestContext, query: ListAlertsQuery = {}) {
    return {
      items: this.persistence.listAlertEvents({
        organizationId: context.organization.id,
        severity: query.severity,
        status: query.status,
      }),
    };
  }

  evaluate(
    context: RequestContext,
    input: { now?: string } = {},
  ): EvaluateAlertsResponse {
    return this.evaluator.evaluate({
      now: input.now,
      organizationId: context.organization.id,
    });
  }

  acknowledge(context: RequestContext, alertId: string) {
    const event = this.persistence.updateAlertEvent(
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
    this.logLifecycle(context, alertId, "acknowledged");
    return event;
  }

  resolve(context: RequestContext, alertId: string) {
    const event = this.persistence.updateAlertEvent(
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
    this.logLifecycle(context, alertId, "resolved");
    return event;
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
