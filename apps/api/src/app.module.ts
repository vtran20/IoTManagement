import "reflect-metadata";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AlertsModule } from "./alerts/alerts.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { ApiErrorFilter } from "./common/errors/api-error.filter";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HealthController } from "./health/health.controller";
import { JobsModule } from "./jobs/jobs.module";
import { MetersModule } from "./meters/meters.module";
import { PersistenceModule } from "./persistence/persistence.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { ReadingsModule } from "./readings/readings.module";
import { ReportsModule } from "./reports/reports.module";
import { SimulationsModule } from "./simulations/simulations.module";
import { TenantsModule } from "./tenants/tenants.module";

@Module({
  controllers: [HealthController],
  imports: [
    PersistenceModule,
    AuthModule,
    TenantsModule,
    PortfolioModule,
    MetersModule,
    ReadingsModule,
    SimulationsModule,
    AnalyticsModule,
    DashboardModule,
    JobsModule,
    AlertsModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApiErrorFilter,
    },
  ],
})
export class AppModule {}
