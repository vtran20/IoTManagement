import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { InMemoryPersistenceService } from "./in-memory-persistence.service";
import { PERSISTENCE_SERVICE } from "./persistence.service";
import { PostgresPersistenceService } from "./postgres-persistence.service";

@Module({
  exports: [PERSISTENCE_SERVICE, InMemoryPersistenceService],
  imports: [DatabaseModule],
  providers: [
    InMemoryPersistenceService,
    PostgresPersistenceService,
    {
      provide: PERSISTENCE_SERVICE,
      useExisting: PostgresPersistenceService,
    },
  ],
})
export class PersistenceModule {}
