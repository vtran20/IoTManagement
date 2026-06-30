import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { AuthModule } from "../auth/auth.module";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  controllers: [OrganizationsController, MembershipsController],
  imports: [PersistenceModule, AuthModule],
  providers: [OrganizationsService, MembershipsService],
})
export class TenantsModule {}
