import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { PersistenceModule } from "../persistence/persistence.module";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";

@Module({
  controllers: [InvitationsController],
  imports: [PersistenceModule, EmailModule, AuthModule],
  providers: [InvitationsService],
})
export class InvitationsModule {}
