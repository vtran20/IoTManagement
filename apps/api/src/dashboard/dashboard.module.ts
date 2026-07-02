import { Module } from "@nestjs/common";
import { AlertsModule } from "../alerts/alerts.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AuthModule } from "../auth/auth.module";
import { DashboardTimingInterceptor } from "../common/interceptors/dashboard-timing.interceptor";
import { StructuredLogger } from "../common/logging/logger";
import { PersistenceModule } from "../persistence/persistence.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  controllers: [DashboardController],
  imports: [AlertsModule, AnalyticsModule, AuthModule, PersistenceModule],
  providers: [
    DashboardService,
    DashboardTimingInterceptor,
    StructuredLogger,
    { provide: "NODE_ENV", useValue: process.env.NODE_ENV },
  ],
})
export class DashboardModule {}
