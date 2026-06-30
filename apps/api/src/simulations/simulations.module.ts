import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { ReadingsModule } from "../readings/readings.module";
import { DemoSeedService } from "./demo-seed.service";
import { SimulationsController } from "./simulations.controller";
import { SimulationsService } from "./simulations.service";

@Module({
  controllers: [SimulationsController],
  imports: [AnalyticsModule, AuthModule, PersistenceModule, ReadingsModule],
  providers: [DemoSeedService, SimulationsService],
})
export class SimulationsModule {}
