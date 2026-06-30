import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@iot-management/types";
import { ApiError } from "../errors/api-error";
import { RequestWithContext } from "../request-context";

export const requiredRolesMetadataKey = "requiredRoles";

export function Roles(...roles: UserRole[]) {
  return SetMetadata(requiredRolesMetadataKey, roles);
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(requiredRolesMetadataKey, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const role = request.context?.membership.role;

    if (role && requiredRoles.includes(role)) {
      return true;
    }

    throw new ApiError(
      "ROLE_FORBIDDEN",
      `This action requires one of these roles: ${requiredRoles.join(", ")}`,
      HttpStatus.FORBIDDEN,
    );
  }
}
