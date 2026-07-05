import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

@Module({
  controllers: [VendorsController],
  imports: [AuthModule, PersistenceModule],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
