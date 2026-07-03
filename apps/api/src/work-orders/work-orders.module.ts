import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import {
  IncidentWorkOrdersController,
  WorkOrdersController,
} from "./work-orders.controller";
import { WorkOrdersService } from "./work-orders.service";

@Module({
  controllers: [IncidentWorkOrdersController, WorkOrdersController],
  imports: [AuthModule, PersistenceModule],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule {}
