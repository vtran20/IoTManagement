import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationsService } from "./invitations.service";

@Controller("invitations")
export class InvitationsController {
  constructor(
    @Inject(InvitationsService)
    private readonly invitationsService: InvitationsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("owner", "manager")
  create(@Req() request: RequestWithContext, @Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(request.context!, dto);
  }

  @Get(":token")
  preview(@Param("token") token: string) {
    return this.invitationsService.preview(token);
  }

  @Post("accept")
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.invitationsService.accept(dto);
    response.status(
      result.alreadyAccepted ? HttpStatus.OK : HttpStatus.CREATED,
    );
    return { membership: result.membership };
  }
}
