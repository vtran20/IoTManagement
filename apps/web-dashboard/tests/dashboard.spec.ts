import { expect, test } from "@playwright/test";

test("app shell navigation exposes core operations pages", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  for (const name of [
    "Dashboard",
    "Buildings",
    "Units",
    "Meters",
    "Alerts",
    "Reports",
    "Settings",
  ]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }

  await page.getByRole("link", { name: "Meters" }).click();
  await expect(page).toHaveURL(/\/meters$/);
  await expect(page.getByRole("heading", { name: "Meters" })).toBeVisible();
});

test("login handles bad credentials and successful owner login", async ({
  page,
}) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("owner@north.example");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();

  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("North Owner")).toBeVisible();
});

test("overview renders loading, empty, error, and success states", async ({
  page,
}) => {
  await page.goto("/dashboard?state=loading");
  await expect(page.getByText("Loading dashboard data")).toBeVisible();

  await page.goto("/dashboard?state=empty");
  await expect(page.getByText("No utility data yet")).toBeVisible();

  await page.goto("/dashboard?state=error");
  await expect(page.getByText("Dashboard data is unavailable")).toBeVisible();

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Water Usage" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Electric Usage" }),
  ).toBeVisible();
  await expect(page.getByText("128,440 gal")).toBeVisible();
  await expect(page.getByText("42,817 kWh")).toBeVisible();
});

test("portfolio tables stay readable with long names", async ({ page }) => {
  await page.goto("/buildings");
  await expect(
    page.getByText(
      "North Ridge Mixed Use Building With A Very Long Operational Name",
    ),
  ).toBeVisible();

  await page.goto("/buildings/building_north_ridge");
  await expect(
    page.getByRole("heading", {
      name: "North Ridge Mixed Use Building With A Very Long Operational Name",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Main Water Riser Meter With Extremely Long Identifier"),
  ).toBeVisible();

  await page.goto("/units");
  await page.getByLabel("Utility filter").selectOption("water");
  await expect(
    page.getByText("Apartment 1201 With Long Tenant Label"),
  ).toBeVisible();

  await page.goto("/meters");
  await expect(
    page.getByText("nr-water-main-riser-meter-with-long-id-0001"),
  ).toBeVisible();
  await expect(page.getByText("online")).toBeVisible();
});

test("reports and settings pages support demo operations", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Monthly Usage Report" }),
  ).toBeVisible();
  await expect(page.getByText("$1,284.40")).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Water rate").fill("0.007");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
});
