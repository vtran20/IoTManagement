import type { Page } from "@playwright/test";

export const authUser = {
  membership: {
    id: "membership_north_owner",
    organizationId: "org_north",
    role: "owner",
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

export async function mockAuthenticatedSession(page: Page) {
  await page.context().addCookies([
    {
      domain: "127.0.0.1",
      httpOnly: true,
      name: "iot_management_session",
      path: "/",
      sameSite: "Lax",
      value: "playwright-session",
    },
  ]);
  await page.route("http://127.0.0.1:3001/api/v1/auth/me", async (route) => {
    await route.fulfill({
      body: JSON.stringify(authUser),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("http://127.0.0.1:3001/api/v1/auth/csrf", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ csrfToken: "playwright-csrf" }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(
    "http://127.0.0.1:3001/api/v1/auth/logout",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ success: true }),
        contentType: "application/json",
        headers: {
          "set-cookie":
            "iot_management_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
        },
        status: 201,
      });
    },
  );
}
