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
import { RequestWithContext } from "../common/request-context";
import { IngestReadingDto } from "./dto/ingest-reading.dto";
import { ReadingsService } from "./readings.service";

@Controller()
@UseGuards(AuthGuard)
export class ReadingsController {
  constructor(
    @Inject(ReadingsService) private readonly readingsService: ReadingsService,
  ) {}

  @Post("readings/ingest")
  ingest(
    @Req() request: RequestWithContext,
    @Body() dto: IngestReadingDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = this.readingsService.ingest(request.context!, dto);
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
