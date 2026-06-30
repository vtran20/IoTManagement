import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { RunSimulationDto } from "./dto/run-simulation.dto";
import { SimulationsService } from "./simulations.service";

@Controller("simulations")
@UseGuards(AuthGuard, RolesGuard)
export class SimulationsController {
  constructor(
    @Inject(SimulationsService)
    private readonly simulationsService: SimulationsService,
  ) {}

  @Post("run")
  @Roles("owner", "manager")
  run(
    @Req() request: RequestWithContext,
    @Body() dto: RunSimulationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = this.simulationsService.run(request.context!, dto);
    response.status(result.acceptedCount > 0 ? 201 : 200);
    return result;
  }
}
