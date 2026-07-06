import { describe, expect, it, vi } from "vitest";
import type { EmailService } from "../email/email.service";
import type { RequestContext } from "../common/request-context";
import { hashSessionToken } from "../auth/session";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { InvitationsService } from "./invitations.service";

const northOwnerContext: RequestContext = {
  membership: {
    id: "membership_north_owner",
    organizationId: "org_north",
    role: "owner",
    status: "active",
    userId: "user_north_owner",
  },
  organization: {
    createdAt: "2026-06-29T00:00:00.000Z",
    id: "org_north",
    name: "North Properties",
    status: "active",
  },
  user: {
    createdAt: "2026-06-29T00:00:00.000Z",
    email: "owner@north.example",
    id: "user_north_owner",
    name: "North Owner",
  },
};

function createEmailService(): EmailService {
  return {
    sendIncidentNotification: vi.fn(),
    sendInvitation: vi.fn(),
    sendPasswordReset: vi.fn(),
  } as unknown as EmailService;
}

describe("InvitationsService", () => {
  it("prevents a manager from inviting an owner", async () => {
    const email = createEmailService();
    const service = new InvitationsService(
      new InMemoryPersistenceService(),
      email,
    );
    const managerContext: RequestContext = {
      ...northOwnerContext,
      membership: {
        id: "membership_north_manager",
        organizationId: "org_north",
        role: "manager",
        status: "active",
        userId: "user_north_manager",
      },
    };

    await expect(
      service.create(managerContext, {
        email: "new-owner@north.example",
        role: "owner",
      }),
    ).rejects.toMatchObject({
      code: "INVITATION_ROLE_FORBIDDEN",
      statusCode: 403,
    });

    expect(email.sendInvitation).not.toHaveBeenCalled();
  });

  it("normalizes an invitation email and records the owner-selected role", async () => {
    const persistence = new InMemoryPersistenceService();
    const email = createEmailService();
    const service = new InvitationsService(persistence, email);

    const result = await service.create(northOwnerContext, {
      email: "  New.Manager@North.Example  ",
      role: "manager",
    });

    expect(result.invitation).toMatchObject({
      email: "new.manager@north.example",
      organizationId: "org_north",
      role: "manager",
      status: "pending",
    });
    expect(email.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new.manager@north.example",
        organizationName: "North Properties",
        role: "manager",
      }),
    );
  });

  it("accepts an invitation into its declared organization and role", async () => {
    const persistence = new InMemoryPersistenceService();
    const service = new InvitationsService(persistence, createEmailService());
    const token = "accept-invitation-token";
    persistence.createInvitation({
      email: "new-viewer@north.example",
      expiresAt: "2030-01-01T00:00:00.000Z",
      inviterUserId: "user_north_owner",
      organizationId: "org_north",
      role: "viewer",
      tokenHash: hashSessionToken(token),
    });

    const result = await service.accept({
      name: "New Viewer",
      password: "a-secure-viewer-password",
      token,
    });

    expect(result).toMatchObject({
      alreadyAccepted: false,
      membership: {
        organizationId: "org_north",
        role: "viewer",
        status: "active",
      },
    });
    expect(
      persistence.findMembershipByOrganizationAndUser(
        "org_north",
        "user_new_viewer_north_example",
      ),
    ).toMatchObject({ role: "viewer", status: "active" });
  });
});
