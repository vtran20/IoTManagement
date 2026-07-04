import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { UserRole } from "@iot-management/types";
import { createPasswordHash } from "../auth/password";
import { assertPasswordPolicy } from "../auth/password-policy";
import { createSessionToken, hashSessionToken } from "../auth/session";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import { EMAIL_SERVICE, EmailService } from "../email/email.service";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
  StoredInvitation,
} from "../persistence/persistence.service";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { CreateInvitationDto } from "./dto/create-invitation.dto";

const invitationDurationMs = 1000 * 60 * 60 * 24 * 7;
const managedRoles = new Set<UserRole>(["owner", "manager", "viewer"]);

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailService,
  ) {}

  async create(context: RequestContext, dto: CreateInvitationDto) {
    const email = normalizeEmail(dto.email);
    if (!email) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Email is required",
        HttpStatus.BAD_REQUEST,
      );
    }

    const role = this.assertManagedRole(dto.role ?? "viewer");
    this.assertCanInvite(context.membership.role, role);

    const token = createSessionToken();
    const invitation = await this.persistence.createInvitation({
      email,
      expiresAt: new Date(Date.now() + invitationDurationMs).toISOString(),
      inviterUserId: context.user.id,
      organizationId: context.organization.id,
      role,
      tokenHash: hashSessionToken(token),
    });
    await this.emailService.sendInvitation({
      email,
      invitationUrl: `${webBaseUrl()}/accept-invitation?token=${token}`,
      organizationName: context.organization.name,
      role,
    });
    await this.persistence.createAuditLog({
      action: "invitation.created",
      actorUserId: context.user.id,
      metadata: { email, role },
      organizationId: context.organization.id,
      targetId: invitation.id,
      targetType: "invitation",
    });

    return {
      invitation: invitationSummary(invitation),
    };
  }

  async preview(token: string | undefined) {
    const invitation = await this.findInvitation(token);
    const organization = await this.persistence.findOrganizationById(
      invitation.organizationId,
    );
    if (!organization) {
      throw invitationInvalid();
    }

    return {
      invitation: {
        email: invitation.email,
        organizationName: organization.name,
        role: invitation.role,
        status: invitationStatus(invitation),
      },
    };
  }

  async accept(dto: AcceptInvitationDto) {
    const invitation = await this.findInvitation(dto.token);
    if (invitationStatus(invitation) === "expired" || invitation.revokedAt) {
      throw invitationInvalid();
    }

    const existingUser = await this.persistence.findUserByEmail(
      invitation.email,
    );
    const existingMembership = existingUser
      ? await this.persistence.findMembershipByOrganizationAndUser(
          invitation.organizationId,
          existingUser.id,
        )
      : undefined;
    if (invitation.acceptedAt && existingMembership) {
      return { alreadyAccepted: true, membership: existingMembership };
    }

    const name = dto.name?.trim() || invitation.email;
    const password = assertPasswordPolicy(dto.password);
    const user = await this.persistence.createUser({
      email: invitation.email,
      name,
      passwordHash: createPasswordHash(password),
    });

    const membership =
      existingMembership ??
      (await this.persistence.createMembershipForCurrentOrganization({
        email: user.email,
        organizationId: invitation.organizationId,
        role: invitation.role,
      }));

    if (!invitation.acceptedAt) {
      await this.persistence.markInvitationAccepted(
        invitation.id,
        new Date().toISOString(),
      );
      await this.persistence.createAuditLog({
        action: "invitation.accepted",
        actorUserId: user.id,
        metadata: { email: invitation.email, role: invitation.role },
        organizationId: invitation.organizationId,
        targetId: invitation.id,
        targetType: "invitation",
      });
    }

    return { alreadyAccepted: false, membership };
  }

  private async findInvitation(
    token: string | undefined,
  ): Promise<StoredInvitation> {
    if (!token) {
      throw invitationInvalid();
    }
    const invitation = await this.persistence.findInvitationByTokenHash(
      hashSessionToken(token),
    );
    if (!invitation) {
      throw invitationInvalid();
    }
    return invitation;
  }

  private assertCanInvite(actorRole: UserRole, invitedRole: UserRole): void {
    if (actorRole === "manager" && invitedRole !== "viewer") {
      throw new ApiError(
        "INVITATION_ROLE_FORBIDDEN",
        "Managers can only invite viewers",
        HttpStatus.FORBIDDEN,
      );
    }
    if (actorRole !== "owner" && actorRole !== "manager") {
      throw new ApiError(
        "ROLE_FORBIDDEN",
        "This action requires owner or manager role",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertManagedRole(role: UserRole): UserRole {
    if (!managedRoles.has(role)) {
      throw new ApiError(
        "VALIDATION_FAILED",
        "Role must be owner, manager, or viewer",
        HttpStatus.BAD_REQUEST,
      );
    }
    return role;
  }
}

function normalizeEmail(email: string | undefined): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized || undefined;
}

function invitationSummary(invitation: StoredInvitation) {
  return {
    id: invitation.id,
    email: invitation.email,
    organizationId: invitation.organizationId,
    role: invitation.role,
    status: invitationStatus(invitation),
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  };
}

function invitationStatus(invitation: StoredInvitation) {
  if (invitation.acceptedAt) {
    return "accepted";
  }
  if (invitation.revokedAt) {
    return "revoked";
  }
  if (invitation.expiresAt <= new Date().toISOString()) {
    return "expired";
  }
  return "pending";
}

function invitationInvalid(): ApiError {
  return new ApiError(
    "INVITATION_INVALID",
    "Invitation token is invalid or expired",
    HttpStatus.BAD_REQUEST,
  );
}

function webBaseUrl(): string {
  return (process.env.WEB_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
