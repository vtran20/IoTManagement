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
import type { ListWorkOrdersQuery } from "@iot-management/types";
import type { CreateWorkOrderNoteRequest } from "@iot-management/types";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RequestWithContext } from "../common/request-context";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto";
import { UpdateWorkOrderDto } from "./dto/update-work-order.dto";
import { WorkOrdersService } from "./work-orders.service";

@Controller("incidents")
@UseGuards(AuthGuard, RolesGuard)
export class IncidentWorkOrdersController {
  constructor(
    @Inject(WorkOrdersService)
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  @Post(":incidentId/work-orders")
  @Roles("owner", "manager")
  create(
    @Req() request: RequestWithContext,
    @Param("incidentId") incidentId: string,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.workOrdersService.create(request.context!, incidentId, dto);
  }
}

@Controller("work-orders")
@UseGuards(AuthGuard, RolesGuard)
export class WorkOrdersController {
  constructor(
    @Inject(WorkOrdersService)
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  @Get()
  list(
    @Req() request: RequestWithContext,
    @Query() query: ListWorkOrdersQuery,
  ) {
    return this.workOrdersService.list(request.context!, query);
  }

  @Get(":workOrderId")
  get(
    @Req() request: RequestWithContext,
    @Param("workOrderId") workOrderId: string,
  ) {
    return this.workOrdersService.get(request.context!, workOrderId);
  }

  @Patch(":workOrderId")
  @Roles("owner", "manager")
  update(
    @Req() request: RequestWithContext,
    @Param("workOrderId") workOrderId: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.update(request.context!, workOrderId, dto);
  }

  @Get(":workOrderId/notes")
  listNotes(
    @Req() request: RequestWithContext,
    @Param("workOrderId") workOrderId: string,
  ) {
    return this.workOrdersService.listNotes(request.context!, workOrderId);
  }

  @Post(":workOrderId/notes")
  @Roles("owner", "manager")
  createNote(
    @Req() request: RequestWithContext,
    @Param("workOrderId") workOrderId: string,
    @Body() dto: CreateWorkOrderNoteRequest,
  ) {
    return this.workOrdersService.createNote(
      request.context!,
      workOrderId,
      dto,
    );
  }
}
