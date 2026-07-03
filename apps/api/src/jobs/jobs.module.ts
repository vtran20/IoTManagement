import { Module } from "@nestjs/common";
import { IncidentEscalationQueueService } from "./queues";

@Module({
  exports: [IncidentEscalationQueueService],
  providers: [IncidentEscalationQueueService],
})
export class JobsModule {}
