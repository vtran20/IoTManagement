import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { UpdateIncidentResponderSettingsDto } from "./dto/update-incident-responder-settings.dto";
import { IncidentNotificationsService } from "./incident-notifications.service";

@Controller("notifications")
@UseGuards(AuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    @Inject(IncidentNotificationsService)
    private readonly notificationsService: IncidentNotificationsService,
  ) {}

  @Get()
  list(@Req() request: RequestWithContext) {
    return this.notificationsService.list(request.context!);
  }

  @Post(":notificationId/read")
  @HttpCode(200)
  markRead(
    @Req() request: RequestWithContext,
    @Param("notificationId") notificationId: string,
  ) {
    return this.notificationsService.markRead(request.context!, notificationId);
  }
}

@Controller("incident-responder-settings")
@UseGuards(AuthGuard, RolesGuard)
export class IncidentResponderSettingsController {
  constructor(
    @Inject(IncidentNotificationsService)
    private readonly notificationsService: IncidentNotificationsService,
  ) {}

  @Get()
  get(@Req() request: RequestWithContext) {
    return this.notificationsService.getSettings(request.context!);
  }

  @Patch()
  @Roles("owner")
  update(
    @Req() request: RequestWithContext,
    @Body() dto: UpdateIncidentResponderSettingsDto,
  ) {
    return this.notificationsService.updateSettings(request.context!, dto);
  }
}
