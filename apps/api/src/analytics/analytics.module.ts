import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { AnalyticsController } from "./analytics.controller";
import { AggregationService } from "./aggregation.service";
import { CostEstimateService } from "./cost-estimate.service";
import { UsageQueryService } from "./usage-query.service";

@Module({
  controllers: [AnalyticsController],
  exports: [AggregationService, CostEstimateService, UsageQueryService],
  imports: [AuthModule, PersistenceModule],
  providers: [AggregationService, CostEstimateService, UsageQueryService],
})
export class AnalyticsModule {}
