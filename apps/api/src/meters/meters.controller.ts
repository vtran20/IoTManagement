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
import type { ListMetersQuery } from "@iot-management/types";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { CreateMeterDto } from "./dto/create-meter.dto";
import { UpdateMeterDto } from "./dto/update-meter.dto";
import { MetersService } from "./meters.service";

@Controller("meters")
@UseGuards(AuthGuard, RolesGuard)
export class MetersController {
  constructor(
    @Inject(MetersService) private readonly metersService: MetersService,
  ) {}

  @Post()
  @Roles("owner", "manager")
  create(@Req() request: RequestWithContext, @Body() dto: CreateMeterDto) {
    return this.metersService.create(request.context!, dto);
  }

  @Get()
  list(@Req() request: RequestWithContext, @Query() query: ListMetersQuery) {
    return this.metersService.list(request.context!, query);
  }

  @Get(":meterId")
  get(@Req() request: RequestWithContext, @Param("meterId") meterId: string) {
    return this.metersService.get(request.context!, meterId);
  }

  @Patch(":meterId")
  @Roles("owner", "manager")
  update(
    @Req() request: RequestWithContext,
    @Param("meterId") meterId: string,
    @Body() dto: UpdateMeterDto,
  ) {
    return this.metersService.update(request.context!, meterId, dto);
  }
}
