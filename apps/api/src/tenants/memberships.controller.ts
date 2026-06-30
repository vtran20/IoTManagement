import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { CreateMembershipDto, MembershipsService } from "./memberships.service";

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
}
