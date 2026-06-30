import "reflect-metadata";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { ApiErrorFilter } from "./common/errors/api-error.filter";
import { HealthController } from "./health/health.controller";
import { MetersModule } from "./meters/meters.module";
import { PersistenceModule } from "./persistence/persistence.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { ReadingsModule } from "./readings/readings.module";
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
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApiErrorFilter,
    },
  ],
})
export class AppModule {}
