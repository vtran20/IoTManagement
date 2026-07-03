import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { CreateLeakDetectionPolicyDto } from "./dto/create-leak-detection-policy.dto";
import { LeakDetectionPoliciesService } from "./leak-detection-policies.service";

@Controller("leak-detection-policies")
@UseGuards(AuthGuard, RolesGuard)
export class LeakDetectionPoliciesController {
  constructor(
    @Inject(LeakDetectionPoliciesService)
    private readonly policiesService: LeakDetectionPoliciesService,
  ) {}

  @Get()
  list(@Req() request: RequestWithContext) {
    return this.policiesService.list(request.context!);
  }

  @Post()
  @Roles("owner", "manager")
  create(
    @Req() request: RequestWithContext,
    @Body() dto: CreateLeakDetectionPolicyDto,
  ) {
    return this.policiesService.create(request.context!, dto);
  }
}
