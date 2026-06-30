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
import { DemoSeedService } from "./demo-seed.service";
import { RunSimulationDto } from "./dto/run-simulation.dto";
import { SimulationsService } from "./simulations.service";

@Controller("simulations")
@UseGuards(AuthGuard, RolesGuard)
export class SimulationsController {
  constructor(
    @Inject(SimulationsService)
    private readonly simulationsService: SimulationsService,
    @Inject(DemoSeedService)
    private readonly demoSeedService: DemoSeedService,
  ) {}

  @Post("demo-seed")
  @Roles("owner", "manager")
  async demoSeed(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.demoSeedService.seed(request.context!);
    response.status(result.acceptedReadingCount > 0 ? 201 : 200);
    return result;
  }

  @Post("run")
  @Roles("owner", "manager")
  async run(
    @Req() request: RequestWithContext,
    @Body() dto: RunSimulationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.simulationsService.run(request.context!, dto);
    response.status(result.acceptedCount > 0 ? 201 : 200);
    return result;
  }
}
