import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MeterHealthService } from "../meters/meter-health.service";
import { PersistenceModule } from "../persistence/persistence.module";
import { ReadingValidationService } from "./reading-validation.service";
import { ReadingsController } from "./readings.controller";
import { ReadingsService } from "./readings.service";

@Module({
  controllers: [ReadingsController],
  imports: [AuthModule, PersistenceModule],
  providers: [MeterHealthService, ReadingValidationService, ReadingsService],
})
export class ReadingsModule {}
