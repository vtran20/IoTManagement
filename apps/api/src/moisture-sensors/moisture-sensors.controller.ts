import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { CreateMoistureSensorDto } from "./dto/create-moisture-sensor.dto";
import { IngestMoistureSensorEventDto } from "./dto/ingest-moisture-sensor-event.dto";
import { UpdateIncidentCorrelationSettingsDto } from "./dto/update-incident-correlation-settings.dto";
import { UpdateMoistureSensorDto } from "./dto/update-moisture-sensor.dto";
import { MoistureSensorsService } from "./moisture-sensors.service";

@Controller("moisture-sensors")
@UseGuards(AuthGuard, RolesGuard)
export class MoistureSensorsController {
  constructor(
    @Inject(MoistureSensorsService)
    private readonly sensorsService: MoistureSensorsService,
  ) {}

  @Get()
  list(
    @Req() request: RequestWithContext,
    @Query("buildingId") buildingId?: string,
  ) {
    return this.sensorsService.list(request.context!, buildingId);
  }

  @Post()
  @Roles("owner", "manager")
  create(
    @Req() request: RequestWithContext,
    @Body() dto: CreateMoistureSensorDto,
  ) {
    return this.sensorsService.create(request.context!, dto);
  }

  @Get(":sensorId")
  get(@Req() request: RequestWithContext, @Param("sensorId") sensorId: string) {
    return this.sensorsService.get(request.context!, sensorId);
  }

  @Patch(":sensorId")
  @Roles("owner", "manager")
  update(
    @Req() request: RequestWithContext,
    @Param("sensorId") sensorId: string,
    @Body() dto: UpdateMoistureSensorDto,
  ) {
    return this.sensorsService.update(request.context!, sensorId, dto);
  }

  @Get(":sensorId/events")
  listEvents(
    @Req() request: RequestWithContext,
    @Param("sensorId") sensorId: string,
  ) {
    return this.sensorsService.listEvents(request.context!, sensorId);
  }

  @Post(":sensorId/events")
  @Roles("owner", "manager")
  ingest(
    @Req() request: RequestWithContext,
    @Param("sensorId") sensorId: string,
    @Body() dto: IngestMoistureSensorEventDto,
  ) {
    return this.sensorsService.ingest(request.context!, sensorId, dto);
  }
}

@Controller("incident-correlation-settings")
@UseGuards(AuthGuard, RolesGuard)
export class IncidentCorrelationSettingsController {
  constructor(
    @Inject(MoistureSensorsService)
    private readonly sensorsService: MoistureSensorsService,
  ) {}

  @Get()
  get(@Req() request: RequestWithContext) {
    return this.sensorsService.getCorrelationSettings(request.context!);
  }

  @Patch()
  @Roles("owner")
  @HttpCode(200)
  update(
    @Req() request: RequestWithContext,
    @Body() dto: UpdateIncidentCorrelationSettingsDto,
  ) {
    return this.sensorsService.updateCorrelationSettings(request.context!, dto);
  }
}
