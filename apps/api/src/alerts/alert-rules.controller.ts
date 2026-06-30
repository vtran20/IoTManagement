import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { AlertRulesService } from "./alert-rules.service";
import { CreateAlertRuleDto } from "./dto/create-alert-rule.dto";
import { UpdateAlertRuleDto } from "./dto/update-alert-rule.dto";

@Controller("alerts/rules")
@UseGuards(AuthGuard, RolesGuard)
export class AlertRulesController {
  constructor(
    @Inject(AlertRulesService)
    private readonly alertRulesService: AlertRulesService,
  ) {}

  @Post()
  @Roles("owner", "manager")
  create(@Req() request: RequestWithContext, @Body() dto: CreateAlertRuleDto) {
    return this.alertRulesService.create(request.context!, dto);
  }

  @Get()
  list(@Req() request: RequestWithContext) {
    return this.alertRulesService.list(request.context!);
  }

  @Patch(":ruleId")
  @Roles("owner", "manager")
  update(
    @Req() request: RequestWithContext,
    @Param("ruleId") ruleId: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.alertRulesService.update(request.context!, ruleId, dto);
  }
}
