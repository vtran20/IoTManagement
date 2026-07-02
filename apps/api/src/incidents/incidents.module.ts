import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { IncidentsController } from "./incidents.controller";
import { LeakIncidentsService } from "./leak-incidents.service";

@Module({
  controllers: [IncidentsController],
  imports: [AuthModule, PersistenceModule],
  providers: [LeakIncidentsService],
})
export class IncidentsModule {}
