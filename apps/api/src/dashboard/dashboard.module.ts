import { Module } from "@nestjs/common";
import { AlertsModule } from "../alerts/alerts.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AuthModule } from "../auth/auth.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  controllers: [DashboardController],
  imports: [AlertsModule, AnalyticsModule, AuthModule],
  providers: [DashboardService],
})
export class DashboardModule {}
