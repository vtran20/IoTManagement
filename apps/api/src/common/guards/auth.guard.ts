import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "../../auth/auth.service";
import {
  csrfHeaderName,
  getCookie,
  sessionCookieName,
} from "../../auth/session";
import { ApiError } from "../errors/api-error";
import { RequestWithContext } from "../request-context";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;

    if (bearerToken) {
      request.context = await this.authService.authenticateToken(bearerToken);
      request.auth = { scheme: "bearer" };
      return true;
    }

    const sessionToken = getCookie(request.headers.cookie, sessionCookieName);

    if (!sessionToken) {
      throw new ApiError(
        "UNAUTHENTICATED",
        "Authentication is required",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const sessionAuth =
      await this.authService.authenticateSession(sessionToken);
    request.context = sessionAuth.context;
    request.auth = {
      scheme: "session",
      session: sessionAuth.session,
      sessionToken,
    };
    if (requiresCsrf(request.method)) {
      const csrfToken = Array.isArray(request.headers[csrfHeaderName])
        ? request.headers[csrfHeaderName][0]
        : request.headers[csrfHeaderName];
      this.authService.assertValidCsrfToken({
        csrfToken,
        sessionToken,
      });
    }
    return true;
  }
}

function requiresCsrf(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}
