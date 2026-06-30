import { Inject, Injectable } from "@nestjs/common";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";

@Injectable()
export class MeterHealthService {
  constructor(
    @Inject(InMemoryPersistenceService)
    private readonly persistence: InMemoryPersistenceService,
  ) {}

  markReadingAccepted(input: {
    measuredAt: string;
    meterId: string;
    organizationId: string;
  }) {
    this.persistence.updateMeter(input.organizationId, input.meterId, {
      lastReadingAt: input.measuredAt,
      status: "online",
    });
  }
}
