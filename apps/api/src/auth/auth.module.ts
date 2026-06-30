import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  exports: [AuthService],
  imports: [PersistenceModule],
  providers: [AuthService],
})
export class AuthModule {}
