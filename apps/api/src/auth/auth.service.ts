import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { LoginResponse } from "@iot-management/types";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { EMAIL_SERVICE, EmailService } from "../email/email.service";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
  StoredSession,
} from "../persistence/persistence.service";
import { validateApiEnv } from "../config/env.schema";
import { signToken, verifyToken } from "./token";
import { createPasswordHash, verifyPassword } from "./password";
import {
  assertPasswordIsNotReused,
  assertPasswordPolicy,
} from "./password-policy";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import {
  createCsrfToken,
  createSessionToken,
  hashSessionToken,
  isValidCsrfToken,
  sessionDurationMs,
} from "./session";

const passwordResetDurationMs = 1000 * 60 * 30;

export interface LoginResult {
  response: LoginResponse;
  session: StoredSession;
  sessionToken: string;
  sessionExpiresAt: Date;
}

export interface SessionAuthResult {
  context: RequestContext;
  session: StoredSession;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailService,
  ) {}

  async login(
    dto: LoginDto,
    metadata: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<LoginResult> {
    if (!dto.email || !dto.password) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Email and password are required",
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.persistence.findUserByEmail(dto.email);
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new ApiError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const membership = await this.persistence.findPrimaryMembershipForUser(
      user.id,
    );
    if (!membership) {
      throw new ApiError(
        "NO_MEMBERSHIP",
        "User does not belong to an organization",
        HttpStatus.FORBIDDEN,
      );
    }
    if ((membership.status ?? "active") !== "active") {
      throw new ApiError(
        "MEMBERSHIP_DISABLED",
        "Membership is disabled",
        HttpStatus.FORBIDDEN,
      );
    }

    const response = {
      accessToken: signToken({
        userId: user.id,
        organizationId: membership.organizationId,
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
    const sessionToken = createSessionToken();
    const sessionExpiresAt = new Date(Date.now() + sessionDurationMs);
    const session = await this.persistence.createSession({
      expiresAt: sessionExpiresAt.toISOString(),
      ipAddress: metadata.ipAddress,
      membershipId: membership.id,
      organizationId: membership.organizationId,
      tokenHash: hashSessionToken(sessionToken),
      userAgent: metadata.userAgent,
      userId: user.id,
    });

    return {
      response,
      session,
      sessionExpiresAt,
      sessionToken,
    };
  }

  async authenticateToken(token: string): Promise<RequestContext> {
    const payload = verifyToken(token);
    if (!payload) {
      throw new ApiError(
        "UNAUTHENTICATED",
        "Authentication is required",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.persistence.findUserById(payload.userId);
    const membership = await this.persistence.findPrimaryMembershipForUser(
      payload.userId,
    );
    const organization = membership
      ? await this.persistence.findOrganizationById(membership.organizationId)
      : undefined;

    if (
      !user ||
      !membership ||
      !organization ||
      (membership.status ?? "active") !== "active" ||
      membership.organizationId !== payload.organizationId
    ) {
      throw new ApiError(
        "UNAUTHENTICATED",
        "Authentication is required",
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      membership,
      organization,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  }

  async authenticateSession(sessionToken: string): Promise<SessionAuthResult> {
    const session = await this.persistence.findActiveSessionByTokenHash(
      hashSessionToken(sessionToken),
      new Date().toISOString(),
    );
    if (!session) {
      throw new ApiError(
        "UNAUTHENTICATED",
        "Authentication is required",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.persistence.findUserById(session.userId);
    const membership = await this.persistence.findMembershipById(
      session.membershipId,
    );
    const organization = await this.persistence.findOrganizationById(
      session.organizationId,
    );

    if (
      !user ||
      !membership ||
      !organization ||
      (membership.status ?? "active") !== "active" ||
      membership.userId !== session.userId ||
      membership.organizationId !== session.organizationId
    ) {
      throw new ApiError(
        "UNAUTHENTICATED",
        "Authentication is required",
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      context: {
        membership,
        organization,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      },
      session,
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.persistence.revokeSession(sessionId, new Date().toISOString());
  }

  createCsrfToken(sessionToken: string): string {
    return createCsrfToken(sessionToken, validateApiEnv().jwtSessionSecret);
  }

  assertValidCsrfToken(input: {
    csrfToken?: string;
    sessionToken: string;
  }): void {
    if (
      !isValidCsrfToken({
        csrfToken: input.csrfToken,
        secret: validateApiEnv().jwtSessionSecret,
        sessionToken: input.sessionToken,
      })
    ) {
      throw new ApiError(
        "CSRF_TOKEN_INVALID",
        "A valid CSRF token is required",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async changePassword(
    context: RequestContext,
    dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    if (!dto.currentPassword) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Current password is required",
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.persistence.findUserById(context.user.id);
    if (!user || !verifyPassword(dto.currentPassword, user.passwordHash)) {
      throw new ApiError(
        "CURRENT_PASSWORD_INVALID",
        "Current password is incorrect",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const candidatePassword = dto.newPassword;
    if (candidatePassword) {
      assertPasswordIsNotReused(candidatePassword, user.passwordHash);
    }
    const newPassword = assertPasswordPolicy(candidatePassword);
    await this.persistence.updateUserPasswordHash(
      user.id,
      createPasswordHash(newPassword),
    );

    return { success: true };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    metadata: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<{ success: true }> {
    const email = dto.email?.toLowerCase();
    const user = email
      ? await this.persistence.findUserByEmail(email)
      : undefined;
    if (!user) {
      return { success: true };
    }

    const token = createSessionToken();
    await this.persistence.createPasswordResetToken({
      expiresAt: new Date(Date.now() + passwordResetDurationMs).toISOString(),
      requestedIp: metadata.ipAddress,
      tokenHash: hashSessionToken(token),
      userAgent: metadata.userAgent,
      userId: user.id,
    });
    await this.emailService.sendPasswordReset({
      email: user.email,
      resetUrl: `${webBaseUrl()}/reset-password?token=${token}`,
    });

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    if (!dto.token) {
      throw resetTokenInvalid();
    }

    const resetToken =
      await this.persistence.findActivePasswordResetTokenByHash(
        hashSessionToken(dto.token),
        new Date().toISOString(),
      );
    if (!resetToken) {
      throw resetTokenInvalid();
    }

    const user = await this.persistence.findUserById(resetToken.userId);
    if (!user) {
      throw resetTokenInvalid();
    }

    if (dto.newPassword) {
      assertPasswordIsNotReused(dto.newPassword, user.passwordHash);
    }
    const newPassword = assertPasswordPolicy(dto.newPassword);
    await this.persistence.updateUserPasswordHash(
      user.id,
      createPasswordHash(newPassword),
    );
    await this.persistence.markPasswordResetTokenUsed(
      resetToken.id,
      new Date().toISOString(),
    );

    return { success: true };
  }
}

function resetTokenInvalid(): ApiError {
  return new ApiError(
    "RESET_TOKEN_INVALID",
    "Reset token is invalid or expired",
    HttpStatus.BAD_REQUEST,
  );
}

function webBaseUrl(): string {
  return (process.env.WEB_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
