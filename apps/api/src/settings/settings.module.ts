import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Module({
  controllers: [SettingsController],
  exports: [SettingsService],
  imports: [AuthModule, PersistenceModule],
  providers: [SettingsService],
})
export class SettingsModule {}
