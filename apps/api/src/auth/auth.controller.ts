import {
  Body,
  Controller,
  Get,
  Inject,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiError } from "../common/errors/api-error";
import { AuthGuard } from "../common/guards/auth.guard";
import { RateLimitService } from "../common/rate-limit/rate-limit.service";
import { RequestWithContext } from "../common/request-context";
import { validateApiEnv } from "../config/env.schema";
import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { serializeClearSessionCookie, serializeSessionCookie } from "./session";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.rateLimitService.check({
      key: `auth:${request.ip ?? "local"}:${dto.email?.toLowerCase() ?? "unknown"}`,
      limit: 5,
      message: "Too many auth attempts. Try again later.",
      windowMs: 60_000,
    });
    const result = await this.authService.login(dto, {
      ipAddress: request.ip,
      userAgent: Array.isArray(request.headers["user-agent"])
        ? request.headers["user-agent"][0]
        : request.headers["user-agent"],
    });
    response.setHeader(
      "Set-Cookie",
      serializeSessionCookie({
        expiresAt: result.sessionExpiresAt,
        secure: validateApiEnv().nodeEnv === "production",
        token: result.sessionToken,
      }),
    );
    return result.response;
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() request: RequestWithContext) {
    return request.context;
  }

  @Get("csrf")
  @UseGuards(AuthGuard)
  csrf(@Req() request: RequestWithContext) {
    if (!request.auth?.sessionToken) {
      throw new ApiError(
        "SESSION_REQUIRED",
        "Session authentication is required",
        HttpStatus.FORBIDDEN,
      );
    }
    return {
      csrfToken: this.authService.createCsrfToken(request.auth.sessionToken),
    };
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  async logout(
    @Req() request: RequestWithContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.auth?.session) {
      await this.authService.revokeSession(request.auth.session.id);
    }
    response.setHeader(
      "Set-Cookie",
      serializeClearSessionCookie(validateApiEnv().nodeEnv === "production"),
    );
    return { success: true };
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: RequestWithContext,
  ) {
    return this.authService.changePassword(request.context!, dto);
  }

  @Post("forgot-password")
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() request: RequestWithContext,
  ) {
    return this.authService.forgotPassword(dto, {
      ipAddress: request.ip,
      userAgent: Array.isArray(request.headers["user-agent"])
        ? request.headers["user-agent"][0]
        : request.headers["user-agent"],
    });
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
