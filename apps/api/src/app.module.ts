import "reflect-metadata";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AlertsModule } from "./alerts/alerts.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { StructuredLogger } from "./common/logging/logger";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DevModule } from "./dev/dev.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { InvitationsModule } from "./invitations/invitations.module";
import { JobsModule } from "./jobs/jobs.module";
import { MetersModule } from "./meters/meters.module";
import { PersistenceModule } from "./persistence/persistence.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { ReadingsModule } from "./readings/readings.module";
import { ReportsModule } from "./reports/reports.module";
import { SettingsModule } from "./settings/settings.module";
import { SimulationsModule } from "./simulations/simulations.module";
import { TenantsModule } from "./tenants/tenants.module";

@Module({
  controllers: [HealthController],
  imports: [
    PersistenceModule,
    RateLimitModule,
    AuthModule,
    TenantsModule,
    PortfolioModule,
    MetersModule,
    ReadingsModule,
    SimulationsModule,
    AnalyticsModule,
    DashboardModule,
    InvitationsModule,
    DevModule,
    JobsModule,
    AlertsModule,
    ReportsModule,
    SettingsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    HealthService,
    StructuredLogger,
  ],
})
export class AppModule {}
