import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { UpdateUtilityRatesDto } from "./dto/update-utility-rates.dto";
import { SettingsService } from "./settings.service";

@Controller("settings")
@UseGuards(AuthGuard, RolesGuard)
export class SettingsController {
  constructor(
    @Inject(SettingsService)
    private readonly settingsService: SettingsService,
  ) {}

  @Get("rates")
  rates(@Req() request: RequestWithContext) {
    return this.settingsService.rates(request.context!);
  }

  @Patch("rates")
  @Roles("owner", "manager")
  updateRates(
    @Req() request: RequestWithContext,
    @Body() dto: UpdateUtilityRatesDto,
  ) {
    return this.settingsService.updateRates(request.context!, dto);
  }
}
