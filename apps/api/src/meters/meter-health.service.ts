import { Inject, Injectable } from "@nestjs/common";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

@Injectable()
export class MeterHealthService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async markReadingAccepted(input: {
    measuredAt: string;
    meterId: string;
    organizationId: string;
  }): Promise<void> {
    await this.persistence.updateMeter(input.organizationId, input.meterId, {
      lastReadingAt: input.measuredAt,
      status: "online",
    });
  }
}
