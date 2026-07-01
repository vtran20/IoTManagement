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
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { CreateFloorDto } from "./dto/create-floor.dto";
import { UpdateFloorDto } from "./dto/update-floor.dto";
import { FloorsService } from "./floors.service";

@Controller("floors")
@UseGuards(AuthGuard, RolesGuard)
export class FloorsController {
  constructor(
    @Inject(FloorsService) private readonly floorsService: FloorsService,
  ) {}

  @Post()
  @Roles("owner", "manager")
  create(@Req() request: RequestWithContext, @Body() dto: CreateFloorDto) {
    return this.floorsService.create(request.context!, dto);
  }

  @Get()
  list(
    @Req() request: RequestWithContext,
    @Query() query: { buildingId?: string },
  ) {
    return this.floorsService.list(request.context!, query);
  }

  @Get(":floorId")
  get(@Req() request: RequestWithContext, @Param("floorId") floorId: string) {
    return this.floorsService.get(request.context!, floorId);
  }

  @Patch(":floorId")
  @Roles("owner", "manager")
  update(
    @Req() request: RequestWithContext,
    @Param("floorId") floorId: string,
    @Body() dto: UpdateFloorDto,
  ) {
    return this.floorsService.update(request.context!, floorId, dto);
  }

  @Post(":floorId/archive")
  @HttpCode(200)
  @Roles("owner", "manager")
  archive(
    @Req() request: RequestWithContext,
    @Param("floorId") floorId: string,
  ) {
    return this.floorsService.archive(request.context!, floorId);
  }

  @Post(":floorId/restore")
  @HttpCode(200)
  @Roles("owner", "manager")
  restore(
    @Req() request: RequestWithContext,
    @Param("floorId") floorId: string,
  ) {
    return this.floorsService.restore(request.context!, floorId);
  }
}
