import type {
  IncidentNotification,
  IncidentResponderSettings,
  OperationsNotification,
  LeakIncident,
  UpdateIncidentResponderSettingsRequest,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { EMAIL_SERVICE, EmailService } from "../email/email.service";
import { IncidentEscalationQueueService } from "../jobs/queues";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { tenantResourceNotFound } from "../portfolio/portfolio-errors";

@Injectable()
export class IncidentNotificationsService {
  constructor(
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
    @Inject(IncidentEscalationQueueService)
    private readonly escalationQueue: IncidentEscalationQueueService,
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async notifyIncidentOpened(incident: LeakIncident): Promise<void> {
    const settings = await this.notifyResponders(incident, "incident_opened");
    const deadlineMinutes = acknowledgementDeadlineMinutes(incident, settings);
    if (!deadlineMinutes) {
      return;
    }
    await this.escalationQueue.schedule({
      deadlineAt: new Date(
        new Date(incident.detectedAt).getTime() + deadlineMinutes * 60_000,
      ).toISOString(),
      incidentId: incident.id,
      organizationId: incident.organizationId,
    });
  }

  async notifyAcknowledgementOverdue(incident: LeakIncident): Promise<void> {
    await this.notifyResponders(incident, "acknowledgement_overdue");
  }

  async list(
    context: RequestContext,
  ): Promise<{ items: OperationsNotification[] }> {
    const [incidentNotifications, workOrderNotifications] = await Promise.all([
      this.persistence.listIncidentNotifications({
        organizationId: context.organization.id,
        recipientMembershipId: context.membership.id,
      }),
      this.persistence.listWorkOrderNotifications({
        organizationId: context.organization.id,
        recipientMembershipId: context.membership.id,
      }),
    ]);
    return {
      items: [...incidentNotifications, ...workOrderNotifications].sort(
        (left, right) => right.createdAt.localeCompare(left.createdAt),
      ),
    };
  }

  async markRead(
    context: RequestContext,
    notificationId: string,
  ): Promise<OperationsNotification> {
    const input = {
      notificationId,
      organizationId: context.organization.id,
      readAt: new Date().toISOString(),
      recipientMembershipId: context.membership.id,
    };
    const notification =
      (await this.persistence.markIncidentNotificationRead(input)) ??
      (await this.persistence.markWorkOrderNotificationRead(input));
    if (!notification) {
      throw tenantResourceNotFound("Incident notification");
    }
    return notification;
  }

  getSettings(context: RequestContext): Promise<IncidentResponderSettings> {
    return Promise.resolve(
      this.persistence.getIncidentResponderSettings(context.organization.id),
    );
  }

  async updateSettings(
    context: RequestContext,
    dto: UpdateIncidentResponderSettingsRequest,
  ): Promise<IncidentResponderSettings> {
    const current = await this.persistence.getIncidentResponderSettings(
      context.organization.id,
    );
    const emailEnabled = dto.emailEnabled ?? current.emailEnabled;
    const criticalAcknowledgementDeadlineMinutes =
      dto.criticalAcknowledgementDeadlineMinutes ??
      current.criticalAcknowledgementDeadlineMinutes;
    const warningAcknowledgementDeadlineMinutes =
      dto.warningAcknowledgementDeadlineMinutes ??
      current.warningAcknowledgementDeadlineMinutes;
    assertBoolean("emailEnabled", emailEnabled);
    assertDeadline(
      "criticalAcknowledgementDeadlineMinutes",
      criticalAcknowledgementDeadlineMinutes,
    );
    assertDeadline(
      "warningAcknowledgementDeadlineMinutes",
      warningAcknowledgementDeadlineMinutes,
    );
    const settings = await this.persistence.upsertIncidentResponderSettings({
      criticalAcknowledgementDeadlineMinutes,
      emailEnabled,
      organizationId: context.organization.id,
      updatedAt: new Date().toISOString(),
      warningAcknowledgementDeadlineMinutes,
    });
    await this.persistence.createAuditLog({
      action: "incident_responder_settings.updated",
      actorUserId: context.user.id,
      metadata: {
        criticalAcknowledgementDeadlineMinutes,
        emailEnabled,
        warningAcknowledgementDeadlineMinutes,
      },
      organizationId: context.organization.id,
      targetId: context.organization.id,
      targetType: "incident_responder_settings",
    });
    return settings;
  }

  private async notifyResponders(
    incident: LeakIncident,
    kind: IncidentNotification["kind"],
  ): Promise<IncidentResponderSettings> {
    const [settings, memberships] = await Promise.all([
      this.persistence.getIncidentResponderSettings(incident.organizationId),
      this.persistence.listMemberships(incident.organizationId),
    ]);
    const recipients = memberships.filter(
      (membership) =>
        membership.status === "active" &&
        (membership.role === "owner" || membership.role === "manager"),
    );
    const now = new Date().toISOString();

    await Promise.all(
      recipients.map(async (membership) => {
        const dedupeKey = `${incident.id}:${kind}`;
        await this.persistence.createIncidentNotification({
          channel: "in_app",
          createdAt: now,
          dedupeKey,
          incidentId: incident.id,
          kind,
          organizationId: incident.organizationId,
          recipientMembershipId: membership.id,
          status: "delivered",
        });

        if (!settings.emailEnabled) {
          return;
        }
        const recipient = await this.persistence.findUserById(
          membership.userId,
        );
        if (!recipient) {
          return;
        }
        const outboxItem = await this.email.sendIncidentNotification({
          dedupeKey: `incident:${incident.id}:${membership.id}:${kind}`,
          incident,
          kind,
          recipientEmail: recipient.email,
        });
        await this.persistence.createIncidentNotification({
          channel: "email",
          createdAt: now,
          dedupeKey,
          emailOutboxId: outboxItem.id,
          incidentId: incident.id,
          kind,
          organizationId: incident.organizationId,
          recipientMembershipId: membership.id,
          status: "queued",
        });
      }),
    );
    return settings;
  }
}

function acknowledgementDeadlineMinutes(
  incident: LeakIncident,
  settings: IncidentResponderSettings,
): number | undefined {
  if (incident.severity === "critical") {
    return settings.criticalAcknowledgementDeadlineMinutes;
  }
  if (incident.severity === "warning") {
    return settings.warningAcknowledgementDeadlineMinutes;
  }
  return undefined;
}

function assertBoolean(
  field: string,
  value: unknown,
): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new ApiError(
      "INVALID_INCIDENT_RESPONDER_SETTINGS",
      `${field} must be a boolean`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

function assertDeadline(
  field: string,
  value: unknown,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 1440
  ) {
    throw new ApiError(
      "INVALID_INCIDENT_RESPONDER_SETTINGS",
      `${field} must be an integer between 1 and 1440`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
