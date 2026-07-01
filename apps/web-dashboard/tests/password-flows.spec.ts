import { expect, test } from "@playwright/test";
import { mockAuthenticatedSession } from "./auth-fixture";

test("forgot-password submits a generic reset request", async ({ page }) => {
  await page.route(
    "http://127.0.0.1:3001/api/v1/auth/forgot-password",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ success: true }),
        contentType: "application/json",
        status: 201,
      });
    },
  );

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("owner@north.example");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(
    page.getByText("If an account exists, a reset link has been sent."),
  ).toBeVisible();
});

test("reset-password accepts a token and saves the new password", async ({
  page,
}) => {
  await page.route(
    "http://127.0.0.1:3001/api/v1/auth/reset-password",
    async (route) => {
      const body = route.request().postDataJSON() as {
        newPassword?: string;
        token?: string;
      };
      await route.fulfill({
        body: JSON.stringify({ success: true }),
        contentType: "application/json",
        status:
          body.token === "playwright-reset-token" &&
          body.newPassword === "new-reset-password"
            ? 201
            : 400,
      });
    },
  );

  await page.goto("/reset-password?token=playwright-reset-token");
  await page.getByLabel("New password").fill("new-reset-password");
  await page.getByRole("button", { name: "Save password" }).click();

  await expect(
    page.getByText("Password updated. You can sign in now."),
  ).toBeVisible();
});

test("settings security changes the current user's password", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.route(
    "http://127.0.0.1:3001/api/v1/auth/change-password",
    async (route) => {
      const body = route.request().postDataJSON() as {
        currentPassword?: string;
        newPassword?: string;
      };
      await route.fulfill({
        body: JSON.stringify({ success: true }),
        contentType: "application/json",
        status:
          body.currentPassword === "password123" &&
          body.newPassword === "phase3-new-password"
            ? 201
            : 400,
      });
    },
  );

  await page.goto("/settings/security");
  await page.getByLabel("Current password").fill("password123");
  await page.getByLabel("New password").fill("phase3-new-password");
  await page.getByRole("button", { name: "Change password" }).click();

  await expect(page.getByText("Password changed")).toBeVisible();
});
