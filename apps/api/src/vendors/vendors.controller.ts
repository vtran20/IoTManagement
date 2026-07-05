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
import type {
  CreateVendorRequest,
  UpdateVendorRequest,
} from "@iot-management/types";
import { VendorsService } from "./vendors.service";

@Controller("vendors")
@UseGuards(AuthGuard, RolesGuard)
export class VendorsController {
  constructor(
    @Inject(VendorsService) private readonly vendors: VendorsService,
  ) {}

  @Get()
  list(@Req() request: RequestWithContext) {
    return this.vendors.list(request.context!);
  }

  @Post()
  @Roles("owner", "manager")
  create(@Req() request: RequestWithContext, @Body() dto: CreateVendorRequest) {
    return this.vendors.create(request.context!, dto);
  }

  @Patch(":vendorId")
  @Roles("owner", "manager")
  update(
    @Req() request: RequestWithContext,
    @Param("vendorId") vendorId: string,
    @Body() dto: UpdateVendorRequest,
  ) {
    return this.vendors.update(request.context!, vendorId, dto);
  }
}
