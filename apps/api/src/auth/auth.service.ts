import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { LoginResponse } from "@iot-management/types";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";
import { signToken, verifyToken } from "./token";
import { verifyPassword } from "./password";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
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

    return {
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
}
