import { Module } from "@nestjs/common";
import {
  IncidentEscalationQueueService,
  WorkOrderOverdueQueueService,
} from "./queues";

@Module({
  exports: [IncidentEscalationQueueService, WorkOrderOverdueQueueService],
  providers: [IncidentEscalationQueueService, WorkOrderOverdueQueueService],
})
export class JobsModule {}
