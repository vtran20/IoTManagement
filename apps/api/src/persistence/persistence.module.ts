import { Module } from "@nestjs/common";
import { InMemoryPersistenceService } from "./in-memory-persistence.service";

@Module({
  exports: [InMemoryPersistenceService],
  providers: [InMemoryPersistenceService],
})
export class PersistenceModule {}
