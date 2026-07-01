import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { EMAIL_SERVICE, OutboxEmailService } from "./email.service";

@Module({
  exports: [EMAIL_SERVICE],
  imports: [PersistenceModule],
  providers: [
    {
      provide: EMAIL_SERVICE,
      useClass: OutboxEmailService,
    },
  ],
})
export class EmailModule {}
