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
}
