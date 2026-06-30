import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [ReportsController],
  exports: [ReportsService],
  imports: [AuthModule, PersistenceModule],
  providers: [ReportsService],
})
export class ReportsModule {}
