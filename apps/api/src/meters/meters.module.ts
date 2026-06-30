import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { MetersController } from "./meters.controller";
import { MetersService } from "./meters.service";

@Module({
  controllers: [MetersController],
  imports: [AuthModule, PersistenceModule],
  providers: [MetersService],
})
export class MetersModule {}
