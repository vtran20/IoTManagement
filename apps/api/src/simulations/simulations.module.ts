import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { ReadingsModule } from "../readings/readings.module";
import { SimulationsController } from "./simulations.controller";
import { SimulationsService } from "./simulations.service";

@Module({
  controllers: [SimulationsController],
  imports: [AuthModule, PersistenceModule, ReadingsModule],
  providers: [SimulationsService],
})
export class SimulationsModule {}
