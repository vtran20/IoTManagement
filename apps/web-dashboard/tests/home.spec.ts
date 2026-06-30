import { expect, test } from "@playwright/test";

test("renders the dashboard shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Building Utilities Dashboard" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Water Usage" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Electric Usage" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Device Health" }),
  ).toBeVisible();
});
