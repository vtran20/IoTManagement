import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PersistenceModule } from "../persistence/persistence.module";
import {
  IncidentCorrelationSettingsController,
  MoistureSensorsController,
} from "./moisture-sensors.controller";
import { MoistureSensorsService } from "./moisture-sensors.service";

@Module({
  controllers: [
    MoistureSensorsController,
    IncidentCorrelationSettingsController,
  ],
  imports: [AuthModule, NotificationsModule, PersistenceModule],
  providers: [MoistureSensorsService],
})
export class MoistureSensorsModule {}
