import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  exports: [AuthService],
  imports: [EmailModule, PersistenceModule],
  providers: [AuthService],
})
export class AuthModule {}
