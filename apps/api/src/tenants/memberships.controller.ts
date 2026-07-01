import {
  Body,
  Controller,
  Get,
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
import {
  CreateMembershipDto,
  MembershipsService,
  UpdateMembershipDto,
} from "./memberships.service";

@Controller("memberships")
@UseGuards(AuthGuard, RolesGuard)
export class MembershipsController {
  constructor(
    @Inject(MembershipsService)
    private readonly membershipsService: MembershipsService,
  ) {}

  @Post()
  @Roles("owner", "manager")
  create(@Req() request: RequestWithContext, @Body() dto: CreateMembershipDto) {
    return this.membershipsService.create(request.context!, dto);
  }

  @Get()
  @Roles("owner", "manager")
  list(@Req() request: RequestWithContext) {
    return this.membershipsService.list(request.context!);
  }

  @Patch(":membershipId")
  @Roles("owner", "manager")
  updateRole(
    @Req() request: RequestWithContext,
    @Param("membershipId") membershipId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.membershipsService.updateRole(
      request.context!,
      membershipId,
      dto,
    );
  }

  @Post(":membershipId/disable")
  @Roles("owner", "manager")
  disable(
    @Req() request: RequestWithContext,
    @Param("membershipId") membershipId: string,
  ) {
    return this.membershipsService.disable(request.context!, membershipId);
  }

  @Post(":membershipId/reactivate")
  @Roles("owner", "manager")
  reactivate(
    @Req() request: RequestWithContext,
    @Param("membershipId") membershipId: string,
  ) {
    return this.membershipsService.reactivate(request.context!, membershipId);
  }
}
