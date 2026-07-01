import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

@Module({
  controllers: [AuditController],
  exports: [AuditService],
  imports: [AuthModule, PersistenceModule],
  providers: [AuditService],
})
export class AuditModule {}
