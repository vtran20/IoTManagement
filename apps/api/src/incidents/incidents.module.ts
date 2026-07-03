import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { IncidentsController } from "./incidents.controller";
import { LeakDetectionPoliciesController } from "./leak-detection-policies.controller";
import { LeakDetectionPoliciesService } from "./leak-detection-policies.service";
import { LeakDetectionService } from "./leak-detection.service";
import { LeakIncidentsService } from "./leak-incidents.service";

@Module({
  controllers: [IncidentsController, LeakDetectionPoliciesController],
  imports: [AuthModule, PersistenceModule],
  exports: [LeakDetectionService],
  providers: [
    LeakDetectionPoliciesService,
    LeakDetectionService,
    LeakIncidentsService,
  ],
})
export class IncidentsModule {}
