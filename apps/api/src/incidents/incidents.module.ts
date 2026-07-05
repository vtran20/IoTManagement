import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { NotificationsModule } from "../notifications/notifications.module";
import {
  IncidentsController,
  LeakBaselineSettingsController,
} from "./incidents.controller";
import { LeakDetectionPoliciesController } from "./leak-detection-policies.controller";
import { LeakDetectionPoliciesService } from "./leak-detection-policies.service";
import { LeakDetectionService } from "./leak-detection.service";
import { LeakAnalyticsService } from "./leak-analytics.service";
import { LeakBaselineDetectionService } from "./leak-baseline-detection.service";
import { LeakIncidentsService } from "./leak-incidents.service";

@Module({
  controllers: [
    IncidentsController,
    LeakBaselineSettingsController,
    LeakDetectionPoliciesController,
  ],
  imports: [AuthModule, NotificationsModule, PersistenceModule],
  exports: [
    LeakAnalyticsService,
    LeakBaselineDetectionService,
    LeakDetectionService,
    LeakIncidentsService,
  ],
  providers: [
    LeakDetectionPoliciesService,
    LeakDetectionService,
    LeakAnalyticsService,
    LeakBaselineDetectionService,
    LeakIncidentsService,
  ],
})
export class IncidentsModule {}
