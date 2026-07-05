import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { JobsModule } from "../jobs/jobs.module";
import {
  IncidentWorkOrdersController,
  WorkOrdersController,
} from "./work-orders.controller";
import { WorkOrdersService } from "./work-orders.service";

@Module({
  controllers: [IncidentWorkOrdersController, WorkOrdersController],
  imports: [AuthModule, PersistenceModule, JobsModule],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
