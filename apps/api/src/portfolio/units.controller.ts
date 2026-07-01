import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { ListUnitsQuery } from "@iot-management/types";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { UnitsService } from "./units.service";

@Controller("units")
@UseGuards(AuthGuard, RolesGuard)
export class UnitsController {
  constructor(
    @Inject(UnitsService) private readonly unitsService: UnitsService,
  ) {}

  @Post()
  @Roles("owner", "manager")
  create(@Req() request: RequestWithContext, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(request.context!, dto);
  }

  @Get()
  list(@Req() request: RequestWithContext, @Query() query: ListUnitsQuery) {
    return this.unitsService.list(request.context!, query);
  }

  @Get(":unitId")
  get(@Req() request: RequestWithContext, @Param("unitId") unitId: string) {
    return this.unitsService.get(request.context!, unitId);
  }

  @Patch(":unitId")
  @Roles("owner", "manager")
  update(
    @Req() request: RequestWithContext,
    @Param("unitId") unitId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitsService.update(request.context!, unitId, dto);
  }

  @Post(":unitId/archive")
  @HttpCode(200)
  @Roles("owner", "manager")
  archive(@Req() request: RequestWithContext, @Param("unitId") unitId: string) {
    return this.unitsService.archive(request.context!, unitId);
  }

  @Post(":unitId/restore")
  @HttpCode(200)
  @Roles("owner", "manager")
  restore(@Req() request: RequestWithContext, @Param("unitId") unitId: string) {
    return this.unitsService.restore(request.context!, unitId);
  }
}
