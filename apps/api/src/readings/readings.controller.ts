import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { ListReadingsQuery } from "@iot-management/types";
import type { Response } from "express";
import { AuthGuard } from "../common/guards/auth.guard";
import { Roles, RolesGuard } from "../common/guards/roles.guard";
import { RateLimitService } from "../common/rate-limit/rate-limit.service";
import { RequestWithContext } from "../common/request-context";
import { IngestReadingDto } from "./dto/ingest-reading.dto";
import { ReadingsService } from "./readings.service";

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class ReadingsController {
  constructor(
    @Inject(ReadingsService) private readonly readingsService: ReadingsService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post("readings/ingest")
  @Roles("owner", "manager")
  async ingest(
    @Req() request: RequestWithContext,
    @Body() dto: IngestReadingDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.rateLimitService.check({
      key: `ingest:${request.context!.organization.id}:${request.context!.user.id}`,
      limit: 10,
      message: "Too many ingestion requests. Try again later.",
      windowMs: 60_000,
    });
    const result = await this.readingsService.ingest(request.context!, dto);
    response.status(result.duplicate ? 200 : 201);
    return result;
  }

  @Get("meters/:meterId/readings")
  listByMeter(
    @Req() request: RequestWithContext,
    @Param("meterId") meterId: string,
    @Query() query: ListReadingsQuery,
  ) {
    return this.readingsService.listByMeter(request.context!, meterId, query);
  }
}
