import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StructuredLogger } from "../common/logging/logger";
import { PersistenceModule } from "../persistence/persistence.module";
import { AlertEventsService } from "./alert-events.service";
import { AlertEvaluatorService } from "./alert-evaluator.service";
import { AlertRulesController } from "./alert-rules.controller";
import { AlertRulesService } from "./alert-rules.service";
import { AlertsController } from "./alerts.controller";

@Module({
  controllers: [AlertRulesController, AlertsController],
  exports: [AlertEventsService, AlertEvaluatorService, AlertRulesService],
  imports: [AuthModule, PersistenceModule],
  providers: [
    AlertEventsService,
    AlertEvaluatorService,
    AlertRulesService,
    StructuredLogger,
  ],
})
export class AlertsModule {}
