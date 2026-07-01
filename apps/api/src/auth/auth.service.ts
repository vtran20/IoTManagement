import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { LoginResponse } from "@iot-management/types";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
  StoredSession,
} from "../persistence/persistence.service";
import { validateApiEnv } from "../config/env.schema";
import { signToken, verifyToken } from "./token";
import { verifyPassword } from "./password";
import { LoginDto } from "./dto/login.dto";
import {
  createCsrfToken,
  createSessionToken,
  hashSessionToken,
  isValidCsrfToken,
  sessionDurationMs,
} from "./session";

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
}
