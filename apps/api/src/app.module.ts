import "reflect-metadata";
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AlertsModule } from "./alerts/alerts.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { StructuredLogger } from "./common/logging/logger";
import { RequestSecurityMiddleware } from "./common/middleware/request-security.middleware";
import { RateLimitModule } from "./common/rate-limit/rate-limit.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DevModule } from "./dev/dev.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { InvitationsModule } from "./invitations/invitations.module";
import { IncidentsModule } from "./incidents/incidents.module";
import { JobsModule } from "./jobs/jobs.module";
import { MetersModule } from "./meters/meters.module";
import { MoistureSensorsModule } from "./moisture-sensors/moisture-sensors.module";
import { OpenApiModule } from "./openapi/openapi.module";
import { PersistenceModule } from "./persistence/persistence.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { ReadingsModule } from "./readings/readings.module";
import { ReportsModule } from "./reports/reports.module";
import { SettingsModule } from "./settings/settings.module";
import { SimulationsModule } from "./simulations/simulations.module";
import { TenantsModule } from "./tenants/tenants.module";
import { WorkOrdersModule } from "./work-orders/work-orders.module";
import { VendorsModule } from "./vendors/vendors.module";

@Module({
  controllers: [HealthController],
  imports: [
    PersistenceModule,
    AuditModule,
    RateLimitModule,
    AuthModule,
    TenantsModule,
    PortfolioModule,
    MetersModule,
    MoistureSensorsModule,
    ReadingsModule,
    SimulationsModule,
    AnalyticsModule,
    DashboardModule,
    InvitationsModule,
    IncidentsModule,
    WorkOrdersModule,
    VendorsModule,
    DevModule,
    JobsModule,
    AlertsModule,
    ReportsModule,
    SettingsModule,
    OpenApiModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    HealthService,
    RequestSecurityMiddleware,
    StructuredLogger,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestSecurityMiddleware)
      .forRoutes({ method: RequestMethod.ALL, path: "*path" });
  }
}
