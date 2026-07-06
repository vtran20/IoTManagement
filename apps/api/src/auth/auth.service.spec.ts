import { describe, expect, it, vi } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import type { EmailService } from "../email/email.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  it("does not create a session for invalid credentials", async () => {
    const persistence = new InMemoryPersistenceService();
    const createSession = vi.spyOn(persistence, "createSession");
    const service = new AuthService(persistence, {} as EmailService);

    await expect(
      service.login({
        email: "owner@north.example",
        password: "not-the-owner-password",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      statusCode: 401,
    });

    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects login for a disabled membership before creating a session", async () => {
    const persistence = new InMemoryPersistenceService();
    const createSession = vi.spyOn(persistence, "createSession");
    vi.spyOn(persistence, "findPrimaryMembershipForUser").mockReturnValue({
      id: "membership_north_owner",
      organizationId: "org_north",
      role: "owner",
      status: "disabled",
      userId: "user_north_owner",
    });
    const service = new AuthService(persistence, {} as EmailService);

    await expect(
      service.login({
        email: "owner@north.example",
        password: "password123",
      }),
    ).rejects.toMatchObject({
      code: "MEMBERSHIP_DISABLED",
      statusCode: 403,
    });

    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects a session whose membership no longer belongs to its organization", async () => {
    const persistence = new InMemoryPersistenceService();
    const service = new AuthService(persistence, {} as EmailService);
    const login = await service.login({
      email: "owner@north.example",
      password: "password123",
    });
    vi.spyOn(persistence, "findMembershipById").mockReturnValue({
      id: login.session.membershipId,
      organizationId: "org_south",
      role: "owner",
      status: "active",
      userId: login.session.userId,
    });

    await expect(
      service.authenticateSession(login.sessionToken),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      statusCode: 401,
    });
  });
});
