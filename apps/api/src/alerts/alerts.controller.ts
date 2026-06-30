import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { ListAlertsQuery } from "@iot-management/types";
import type { Response } from "express";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { AlertEventsService } from "./alert-events.service";

@Controller("alerts")
@UseGuards(AuthGuard, RolesGuard)
export class AlertsController {
  constructor(
    @Inject(AlertEventsService)
    private readonly alertEventsService: AlertEventsService,
  ) {}

  @Get()
  list(@Req() request: RequestWithContext, @Query() query: ListAlertsQuery) {
    return this.alertEventsService.list(request.context!, query);
  }

  @Post("evaluate")
  @Roles("owner", "manager")
  async evaluate(
    @Req() request: RequestWithContext,
    @Body() body: { now?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.alertEventsService.evaluate(
      request.context!,
      body,
    );
    response.status(result.createdCount > 0 ? 201 : 200);
    return result;
  }

  @Post(":alertId/acknowledge")
  @Roles("owner", "manager")
  acknowledge(
    @Req() request: RequestWithContext,
    @Param("alertId") alertId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.status(200);
    return this.alertEventsService.acknowledge(request.context!, alertId);
  }

  @Post(":alertId/resolve")
  @Roles("owner", "manager")
  resolve(
    @Req() request: RequestWithContext,
    @Param("alertId") alertId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.status(200);
    return this.alertEventsService.resolve(request.context!, alertId);
  }
}
