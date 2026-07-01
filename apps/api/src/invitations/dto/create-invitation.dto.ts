import type { UserRole } from "@iot-management/types";

export class CreateInvitationDto {
  email?: string;
  role?: UserRole;
}
