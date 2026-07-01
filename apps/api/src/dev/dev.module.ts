import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { DevController } from "./dev.controller";

@Module({
  controllers: [DevController],
  imports: [PersistenceModule],
})
export class DevModule {}
