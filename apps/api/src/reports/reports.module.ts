import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IncidentsModule } from "../incidents/incidents.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { ReportsController } from "./reports.controller";
import { LeakReportsService } from "./leak-reports.service";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [ReportsController],
  exports: [ReportsService],
  imports: [AuthModule, IncidentsModule, PersistenceModule],
  providers: [LeakReportsService, ReportsService],
})
export class ReportsModule {}
