import type { LeakIncident } from "@iot-management/types";
import { Inject, Injectable } from "@nestjs/common";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
  StoredEmailOutboxItem,
} from "../persistence/persistence.service";

export const EMAIL_SERVICE = Symbol("EMAIL_SERVICE");

export interface EmailService {
  sendPasswordReset(input: {
    email: string;
    resetUrl: string;
  }): Promise<StoredEmailOutboxItem>;
  sendInvitation(input: {
    email: string;
    invitationUrl: string;
    organizationName: string;
    role: string;
  }): Promise<StoredEmailOutboxItem>;
  sendIncidentNotification(input: {
    dedupeKey: string;
    incident: LeakIncident;
    kind: "incident_opened" | "acknowledgement_overdue";
    recipientEmail: string;
  }): Promise<StoredEmailOutboxItem>;
}

@Injectable()
export class OutboxEmailService implements EmailService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async sendPasswordReset(input: {
    email: string;
    resetUrl: string;
  }): Promise<StoredEmailOutboxItem> {
    return this.persistence.createEmailOutboxItem({
      htmlBody: `<p>Use this link to reset your password: <a href="${input.resetUrl}">${input.resetUrl}</a></p>`,
      subject: "Reset your password",
      textBody: `Use this link to reset your password: ${input.resetUrl}`,
      to: input.email,
    });
  }

  async sendInvitation(input: {
    email: string;
    invitationUrl: string;
    organizationName: string;
    role: string;
  }): Promise<StoredEmailOutboxItem> {
    return this.persistence.createEmailOutboxItem({
      htmlBody: `<p>You were invited to ${input.organizationName} as ${input.role}. Accept your invitation: <a href="${input.invitationUrl}">${input.invitationUrl}</a></p>`,
      subject: "You're invited to IoT Utilities",
      textBody: `You were invited to ${input.organizationName} as ${input.role}.\nAccept your invitation: ${input.invitationUrl}`,
      to: input.email,
    });
  }

  async sendIncidentNotification(input: {
    dedupeKey: string;
    incident: LeakIncident;
    kind: "incident_opened" | "acknowledgement_overdue";
    recipientEmail: string;
  }): Promise<StoredEmailOutboxItem> {
    const severity = capitalize(input.incident.severity);
    const prefix =
      input.kind === "acknowledgement_overdue"
        ? "Acknowledgement overdue"
        : `${severity} water incident`;
    const title = safeText(input.incident.title);
    const textBody = [
      `${prefix}: ${input.incident.title}`,
      input.incident.description,
      `Incident ID: ${input.incident.id}`,
    ].join("\n\n");
    return this.persistence.createEmailOutboxItem({
      dedupeKey: input.dedupeKey,
      htmlBody: `<p><strong>${escapeHtml(prefix)}:</strong> ${escapeHtml(title)}</p><p>${escapeHtml(input.incident.description)}</p><p>Incident ID: ${escapeHtml(input.incident.id)}</p>`,
      subject: `${prefix}: ${title}`,
      textBody,
      to: input.recipientEmail,
    });
  }
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function safeText(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}
