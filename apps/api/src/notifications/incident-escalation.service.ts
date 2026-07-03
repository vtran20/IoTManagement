import { Inject, Injectable } from "@nestjs/common";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { IncidentNotificationsService } from "./incident-notifications.service";

@Injectable()
export class IncidentEscalationService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(IncidentNotificationsService)
    private readonly notifications: IncidentNotificationsService,
  ) {}

  async process(input: {
    incidentId: string;
    organizationId: string;
  }): Promise<{ status: "escalated" | "skipped" }> {
    const incident = await this.persistence.findLeakIncidentById(
      input.organizationId,
      input.incidentId,
    );
    if (
      !incident ||
      incident.status !== "open" ||
      (incident.severity !== "warning" && incident.severity !== "critical")
    ) {
      return { status: "skipped" };
    }
    await this.notifications.notifyAcknowledgementOverdue(incident);
    return { status: "escalated" };
  }
}
