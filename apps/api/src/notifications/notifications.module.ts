import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { JobsModule } from "../jobs/jobs.module";
import { PersistenceModule } from "../persistence/persistence.module";
import {
  IncidentResponderSettingsController,
  NotificationsController,
} from "./notifications.controller";
import { IncidentNotificationsService } from "./incident-notifications.service";
import { IncidentEscalationService } from "./incident-escalation.service";

@Module({
  controllers: [NotificationsController, IncidentResponderSettingsController],
  exports: [IncidentNotificationsService],
  imports: [AuthModule, EmailModule, JobsModule, PersistenceModule],
  providers: [IncidentEscalationService, IncidentNotificationsService],
})
export class NotificationsModule {}
