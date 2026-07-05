import { expect, test, type Page } from "@playwright/test";

const users = {
  manager: "manager@north.example",
  owner: "owner@north.example",
  viewer: "viewer@north.example",
} as const;

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe.serial("real release workflows", () => {
  test("owner sees live dashboard totals and seeded meter inventory", async ({
    page,
  }) => {
    await login(page, users.owner);

    await expect(
      page.getByRole("heading", { name: "Water Usage" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Electric Usage" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Device Health" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Open Alerts" }),
    ).toBeVisible();

    await page.goto("/meters");
    await expect(
      page.getByRole("heading", { name: "Meter Inventory" }),
    ).toBeVisible();
    const meterLink = page.locator("table tbody tr a").first();
    await expect(meterLink).toBeVisible();
    await meterLink.click();
    await expect(
      page.getByRole("heading", { name: "Meter Detail" }),
    ).toBeVisible();
  });

  test("manager creates a building that persists after reload", async ({
    page,
  }) => {
    await login(page, users.manager);
    await page.goto("/buildings");
    const buildingName = "QA Regression Tower";

    await page.getByLabel("Building name").fill(buildingName);
    await page.getByLabel("Address").fill("1 QA Way");
    await page.getByRole("button", { name: "Create building" }).click();
    await expect(page.getByRole("link", { name: buildingName })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: buildingName })).toBeVisible();
  });

  test("owner acknowledges and resolves a seeded high-usage alert", async ({
    page,
  }) => {
    await login(page, users.owner);
    await page.goto("/alerts");
    const alertRow = page.getByRole("row", { name: /High usage/ });

    await alertRow.getByRole("button", { name: "Acknowledge" }).click();
    await expect(alertRow).toContainText("acknowledged");
    await alertRow.getByRole("button", { name: "Resolve" }).click();
    await expect(alertRow).toContainText("resolved");
  });

  test("viewer is read only and can download the seeded monthly report", async ({
    page,
  }) => {
    await login(page, users.viewer);
    await page.goto("/alerts");
    await expect(page.getByText("Read only")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create rule" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Acknowledge" })).toHaveCount(
      0,
    );

    await page.goto("/reports");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download CSV" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("monthly-usage-2026-06.csv");
  });
});
