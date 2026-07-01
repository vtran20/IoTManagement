import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { UserRole } from "@iot-management/types";
import { ApiError } from "../common/errors/api-error";
import { RequestContext } from "../common/request-context";
import {
  PERSISTENCE_SERVICE,
  PersistenceService,
} from "../persistence/persistence.service";

export interface CreateMembershipDto {
  email?: string;
  role?: UserRole;
}

export interface UpdateMembershipDto {
  role?: UserRole;
}

@Injectable()
export class MembershipsService {
  constructor(
    @Inject(PERSISTENCE_SERVICE)
    private readonly persistence: PersistenceService,
  ) {}

  async create(context: RequestContext, dto: CreateMembershipDto) {
    const membership =
      await this.persistence.createMembershipForCurrentOrganization({
        email: dto.email ?? "",
        organizationId: context.organization.id,
        role: dto.role ?? "viewer",
      });

    return { membership };
  }

  async list(context: RequestContext) {
    const items = await this.persistence.listMemberships(
      context.organization.id,
    );
    return { items };
  }

  async updateRole(
    context: RequestContext,
    membershipId: string,
    dto: UpdateMembershipDto,
  ) {
    const role = dto.role ?? "viewer";
    this.assertManagerCanManageRole(context, role);
    const membership = await this.findTenantMembership(context, membershipId);
    await this.assertNotLastOwnerChange(context, membership, role);

    const updated = await this.persistence.updateMembershipRole(
      context.organization.id,
      membershipId,
      role,
    );
    await this.persistence.createAuditLog({
      action: "membership.role_changed",
      actorUserId: context.user.id,
      metadata: { fromRole: membership.role, toRole: role },
      organizationId: context.organization.id,
      targetId: membership.id,
      targetType: "membership",
    });
    return { membership: updated };
  }

  async disable(context: RequestContext, membershipId: string) {
    const membership = await this.findTenantMembership(context, membershipId);
    await this.assertNotLastOwnerChange(context, membership, membership.role, {
      disabling: true,
    });

    const updated = await this.persistence.updateMembershipStatus(
      context.organization.id,
      membershipId,
      "disabled",
    );
    await this.persistence.createAuditLog({
      action: "membership.disabled",
      actorUserId: context.user.id,
      organizationId: context.organization.id,
      targetId: membership.id,
      targetType: "membership",
    });
    return { membership: updated };
  }

  async reactivate(context: RequestContext, membershipId: string) {
    const membership = await this.findTenantMembership(context, membershipId);
    const updated = await this.persistence.updateMembershipStatus(
      context.organization.id,
      membershipId,
      "active",
    );
    await this.persistence.createAuditLog({
      action: "membership.reactivated",
      actorUserId: context.user.id,
      organizationId: context.organization.id,
      targetId: membership.id,
      targetType: "membership",
    });
    return { membership: updated };
  }

  private async findTenantMembership(
    context: RequestContext,
    membershipId: string,
  ) {
    const membership = await this.persistence.findMembershipByOrganizationAndId(
      context.organization.id,
      membershipId,
    );
    if (!membership) {
      throw new ApiError(
        "MEMBERSHIP_NOT_FOUND",
        "Membership was not found",
        HttpStatus.NOT_FOUND,
      );
    }
    return membership;
  }

  private assertManagerCanManageRole(
    context: RequestContext,
    targetRole: UserRole,
  ): void {
    if (context.membership.role === "manager" && targetRole !== "viewer") {
      throw new ApiError(
        "MEMBERSHIP_ROLE_FORBIDDEN",
        "Managers can only manage viewer memberships",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async assertNotLastOwnerChange(
    context: RequestContext,
    membership: { role: UserRole; status?: "active" | "disabled" },
    nextRole: UserRole,
    options: { disabling?: boolean } = {},
  ): Promise<void> {
    const isActiveOwner =
      membership.role === "owner" &&
      (membership.status ?? "active") === "active";
    const wouldRemoveActiveOwner = options.disabling || nextRole !== "owner";
    if (!isActiveOwner || !wouldRemoveActiveOwner) {
      return;
    }

    const activeOwners = await this.persistence.countActiveOwners(
      context.organization.id,
    );
    if (activeOwners <= 1) {
      throw new ApiError(
        "LAST_OWNER_REQUIRED",
        "At least one active owner is required",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
