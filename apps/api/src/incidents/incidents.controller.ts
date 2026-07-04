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
import type {
  LeakAnalyticsQuery,
  ListLeakIncidentsQuery,
} from "@iot-management/types";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { CreateManualLeakIncidentDto } from "./dto/create-manual-leak-incident.dto";
import { CreateIncidentNoteDto } from "./dto/create-incident-note.dto";
import { ResolveLeakIncidentDto } from "./dto/resolve-leak-incident.dto";
import { LeakIncidentsService } from "./leak-incidents.service";
import { LeakAnalyticsService } from "./leak-analytics.service";
import { LeakBaselineDetectionService } from "./leak-baseline-detection.service";
import { UpdateLeakBaselineSettingsDto } from "./dto/update-leak-baseline-settings.dto";

@Controller("incidents")
@UseGuards(AuthGuard, RolesGuard)
export class IncidentsController {
  constructor(
    @Inject(LeakIncidentsService)
    private readonly incidentsService: LeakIncidentsService,
    @Inject(LeakAnalyticsService)
    private readonly analyticsService: LeakAnalyticsService,
  ) {}

  @Get()
  list(
    @Req() request: RequestWithContext,
    @Query() query: ListLeakIncidentsQuery,
  ) {
    return this.incidentsService.list(request.context!, query);
  }

  @Post("manual")
  @Roles("owner", "manager")
  createManual(
    @Req() request: RequestWithContext,
    @Body() dto: CreateManualLeakIncidentDto,
  ) {
    return this.incidentsService.createManual(request.context!, dto);
  }

  @Get("analytics")
  analytics(
    @Req() request: RequestWithContext,
    @Query() query: LeakAnalyticsQuery,
  ) {
    return this.analyticsService.summary(
      request.context!.organization.id,
      query,
    );
  }

  @Post(":incidentId/acknowledge")
  @HttpCode(200)
  @Roles("owner", "manager")
  acknowledge(
    @Req() request: RequestWithContext,
    @Param("incidentId") incidentId: string,
  ) {
    return this.incidentsService.acknowledge(request.context!, incidentId);
  }

  @Post(":incidentId/investigate")
  @HttpCode(200)
  @Roles("owner", "manager")
  investigate(
    @Req() request: RequestWithContext,
    @Param("incidentId") incidentId: string,
  ) {
    return this.incidentsService.investigate(request.context!, incidentId);
  }

  @Post(":incidentId/contain")
  @HttpCode(200)
  @Roles("owner", "manager")
  contain(
    @Req() request: RequestWithContext,
    @Param("incidentId") incidentId: string,
  ) {
    return this.incidentsService.contain(request.context!, incidentId);
  }

  @Post(":incidentId/monitor")
  @HttpCode(200)
  @Roles("owner", "manager")
  monitor(
    @Req() request: RequestWithContext,
    @Param("incidentId") incidentId: string,
  ) {
    return this.incidentsService.monitor(request.context!, incidentId);
  }

  @Post(":incidentId/resolve")
  @HttpCode(200)
  @Roles("owner", "manager")
  resolve(
    @Req() request: RequestWithContext,
    @Param("incidentId") incidentId: string,
    @Body() dto: ResolveLeakIncidentDto,
  ) {
    return this.incidentsService.resolve(request.context!, incidentId, dto);
  }

  @Post(":incidentId/notes")
  @Roles("owner", "manager")
  addNote(
    @Req() request: RequestWithContext,
    @Param("incidentId") incidentId: string,
    @Body() dto: CreateIncidentNoteDto,
  ) {
    return this.incidentsService.addNote(request.context!, incidentId, dto);
  }

  @Get(":incidentId")
  get(
    @Req() request: RequestWithContext,
    @Param("incidentId") incidentId: string,
  ) {
    return this.incidentsService.get(request.context!, incidentId);
  }
}

@Controller("leak-baseline-settings")
@UseGuards(AuthGuard, RolesGuard)
export class LeakBaselineSettingsController {
  constructor(
    @Inject(LeakBaselineDetectionService)
    private readonly baselineService: LeakBaselineDetectionService,
  ) {}

  @Get()
  get(@Req() request: RequestWithContext) {
    return this.baselineService.getSettings(request.context!);
  }

  @Patch()
  @HttpCode(200)
  @Roles("owner")
  update(
    @Req() request: RequestWithContext,
    @Body() dto: UpdateLeakBaselineSettingsDto,
  ) {
    return this.baselineService.updateSettings(request.context!, dto);
  }
}
