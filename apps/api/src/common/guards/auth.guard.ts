import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "../../auth/auth.service";
import { ApiError } from "../errors/api-error";
import { RequestWithContext } from "../request-context";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;

    if (!token) {
      throw new ApiError(
        "UNAUTHENTICATED",
        "Authentication is required",
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.context = await this.authService.authenticateToken(token);
    return true;
  }
}
