import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { BuildingsController } from "./buildings.controller";
import { BuildingsService } from "./buildings.service";
import { FloorsController } from "./floors.controller";
import { FloorsService } from "./floors.service";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";

@Module({
  controllers: [BuildingsController, FloorsController, UnitsController],
  exports: [BuildingsService, FloorsService, UnitsService],
  imports: [AuthModule, PersistenceModule],
  providers: [BuildingsService, FloorsService, UnitsService],
})
export class PortfolioModule {}
