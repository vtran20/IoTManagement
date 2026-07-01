import { expect, test } from "@playwright/test";
import { mockAuthenticatedSession } from "./auth-fixture";

test("settings users lists memberships and sends an invitation", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  let inviteRequestBody: unknown;
  await page.route(
    "http://127.0.0.1:3001/api/v1/memberships",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          items: [
            {
              id: "membership_north_owner",
              organizationId: "org_north",
              role: "owner",
              status: "active",
              userId: "user_north_owner",
            },
            {
              id: "membership_north_viewer",
              organizationId: "org_north",
              role: "viewer",
              status: "disabled",
              userId: "user_north_viewer",
            },
          ],
        }),
        contentType: "application/json",
        status: 200,
      });
    },
  );
  await page.route("**/api/v1/invitations", async (route) => {
    inviteRequestBody = route.request().postDataJSON() as {
      email?: string;
      role?: string;
    };
    await route.fulfill({
      body: JSON.stringify({
        invitation: {
          email: "new.manager@example.com",
          id: "invitation_1",
          organizationId: "org_north",
          role: "manager",
          status: "pending",
        },
      }),
      contentType: "application/json",
      status: 201,
    });
  });

  await page.goto("/settings/users");

  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByText("membership_north_owner")).toBeVisible();
  await expect(
    page.getByRole("cell", { exact: true, name: "owner" }),
  ).toBeVisible();
  await expect(page.getByText("disabled")).toBeVisible();

  await page.getByLabel("Invite email").fill("new.manager@example.com");
  await page.getByLabel("Invite role").selectOption("manager");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText("Invitation sent")).toBeVisible();
  expect(inviteRequestBody).toEqual({
    email: "new.manager@example.com",
    role: "manager",
  });
});

test("accept invitation previews organization and creates the account", async ({
  page,
}) => {
  await page.route(
    "http://127.0.0.1:3001/api/v1/invitations/invite-token",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          invitation: {
            email: "invitee@example.com",
            organizationName: "North Properties",
            role: "viewer",
            status: "pending",
          },
        }),
        contentType: "application/json",
        status: 200,
      });
    },
  );
  await page.route(
    "http://127.0.0.1:3001/api/v1/invitations/accept",
    async (route) => {
      const body = route.request().postDataJSON() as {
        name?: string;
        password?: string;
        token?: string;
      };
      expect(body).toEqual({
        name: "Invited User",
        password: "password123",
        token: "invite-token",
      });
      await route.fulfill({
        body: JSON.stringify({
          membership: {
            id: "membership_invited",
            organizationId: "org_north",
            role: "viewer",
            status: "active",
            userId: "user_invited",
          },
        }),
        contentType: "application/json",
        status: 201,
      });
    },
  );

  await page.goto("/accept-invitation?token=invite-token");

  await expect(page.getByText("North Properties")).toBeVisible();
  await expect(page.getByText("invitee@example.com")).toBeVisible();
  await page.getByLabel("Full name").fill("Invited User");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page.getByText("Invitation accepted")).toBeVisible();
});
