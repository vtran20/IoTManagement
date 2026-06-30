import type {
  RunSimulationResponse,
  SimulationMeterResult,
} from "@iot-management/types";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { ReadingsService } from "../readings/readings.service";
import { RunSimulationDto } from "./dto/run-simulation.dto";
import { generateSimulatedReadings } from "./simulated-usage-profile";

@Injectable()
export class SimulationsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(ReadingsService)
    private readonly readingsService: ReadingsService,
  ) {}

  async run(
    context: RequestContext,
    dto: RunSimulationDto = {},
  ): Promise<RunSimulationResponse> {
    const config = {
      intervalMinutes: dto.intervalMinutes ?? 15,
      intervals: dto.intervals ?? 24,
      offlineMeterExternalIds: dto.offlineMeterExternalIds ?? [],
      scenario: dto.scenario ?? "normal",
      seed: dto.seed ?? "demo",
      startAt: dto.startAt ?? new Date().toISOString(),
    };

    this.validateConfig(config);

    const meters = dto.meterExternalIds?.length
      ? await Promise.all(
          dto.meterExternalIds.map(async (externalId) => {
            const meter = await this.persistence.findMeterByExternalId(
              context.organization.id,
              externalId,
            );
            if (!meter) {
              throw new ApiError(
                "UNKNOWN_METER",
                "Simulation meter externalId was not found in the authenticated tenant scope",
                HttpStatus.NOT_FOUND,
              );
            }
            return meter;
          }),
        )
      : await this.persistence.listMeters({
          organizationId: context.organization.id,
        });

    const results: SimulationMeterResult[] = [];

    for (const meter of meters) {
      const generated = generateSimulatedReadings({
        intervalMinutes: config.intervalMinutes,
        intervals: config.intervals,
        meterExternalId: meter.externalId,
        offlineMeterExternalIds: config.offlineMeterExternalIds,
        scenario: config.scenario,
        seed: config.seed,
        startAt: config.startAt,
        utilityType: meter.utilityType,
      });
      let acceptedCount = 0;
      let duplicateCount = 0;

      for (const reading of generated) {
        const result = await this.readingsService.ingest(context, reading);
        if (result.duplicate) {
          duplicateCount += 1;
        } else if (result.accepted) {
          acceptedCount += 1;
        }
      }

      results.push({
        acceptedCount,
        duplicateCount,
        externalId: meter.externalId,
        generatedCount: generated.length,
        meterId: meter.id,
        skipped: generated.length === 0,
        utilityType: meter.utilityType,
      });
    }

    return {
      acceptedCount: results.reduce(
        (sum, result) => sum + result.acceptedCount,
        0,
      ),
      duplicateCount: results.reduce(
        (sum, result) => sum + result.duplicateCount,
        0,
      ),
      generatedCount: results.reduce(
        (sum, result) => sum + result.generatedCount,
        0,
      ),
      meters: results,
      skippedCount: results.filter((result) => result.skipped).length,
    };
  }

  private validateConfig(input: {
    intervalMinutes: number;
    intervals: number;
    startAt: string;
  }) {
    if (!Number.isInteger(input.intervals) || input.intervals < 1) {
      throw new ApiError(
        "INVALID_SIMULATION_INTERVALS",
        "Simulation intervals must be a positive integer",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!Number.isInteger(input.intervalMinutes) || input.intervalMinutes < 1) {
      throw new ApiError(
        "INVALID_SIMULATION_INTERVAL_MINUTES",
        "Simulation intervalMinutes must be a positive integer",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (Number.isNaN(new Date(input.startAt).getTime())) {
      throw new ApiError(
        "INVALID_SIMULATION_START_AT",
        "Simulation startAt must be a valid ISO timestamp",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
