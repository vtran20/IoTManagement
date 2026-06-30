import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { ListBuildingsQuery } from "@iot-management/types";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { BuildingsService } from "./buildings.service";
import { CreateBuildingDto } from "./dto/create-building.dto";
import { UpdateBuildingDto } from "./dto/update-building.dto";

@Controller("buildings")
@UseGuards(AuthGuard, RolesGuard)
export class BuildingsController {
  constructor(
    @Inject(BuildingsService)
    private readonly buildingsService: BuildingsService,
  ) {}

  @Post()
  @Roles("owner", "manager")
  create(@Req() request: RequestWithContext, @Body() dto: CreateBuildingDto) {
    return this.buildingsService.create(request.context!, dto);
  }

  @Get()
  list(@Req() request: RequestWithContext, @Query() query: ListBuildingsQuery) {
    return this.buildingsService.list(request.context!, query);
  }

  @Get(":buildingId")
  get(
    @Req() request: RequestWithContext,
    @Param("buildingId") buildingId: string,
  ) {
    return this.buildingsService.get(request.context!, buildingId);
  }

  @Patch(":buildingId")
  @Roles("owner", "manager")
  update(
    @Req() request: RequestWithContext,
    @Param("buildingId") buildingId: string,
    @Body() dto: UpdateBuildingDto,
  ) {
    return this.buildingsService.update(request.context!, buildingId, dto);
  }
}
