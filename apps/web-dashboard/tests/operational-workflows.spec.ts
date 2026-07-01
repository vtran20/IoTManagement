import { expect, test } from "@playwright/test";
import { mockAuthenticatedSession } from "./auth-fixture";

test("rates settings loads, saves, and hides mutations for viewers", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  let savedRates: Record<string, number> | undefined;
  await page.route("**/api/v1/settings/rates", async (route) => {
    if (route.request().method() === "PATCH") {
      savedRates = route.request().postDataJSON() as Record<string, number>;
      await route.fulfill({
        body: JSON.stringify({
          electricPerKwh: savedRates.electricPerKwh,
          organizationId: "org_north",
          waterPerGallon: savedRates.waterPerGallon,
        }),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        electricPerKwh: 0.15,
        organizationId: "org_north",
        waterPerGallon: 0.005,
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/settings/rates");

  await expect(
    page.getByRole("heading", { name: "Utility Rates" }),
  ).toBeVisible();
  await expect(page.getByLabel("Water rate")).toHaveValue("0.005");
  await page.getByLabel("Water rate").fill("0.007");
  await page.getByLabel("Electric rate").fill("0.18");
  await page.getByRole("button", { name: "Save rates" }).click();
  await expect(page.getByText("Rates saved")).toBeVisible();
  expect(savedRates).toEqual({ electricPerKwh: 0.18, waterPerGallon: 0.007 });

  await page.unroute("**/api/v1/auth/me");
  await mockAuthenticatedSession(page, { role: "viewer" });
  await page.goto("/settings/rates");
  await expect(page.getByRole("button", { name: "Save rates" })).toHaveCount(0);
  await expect(page.getByText("Read only")).toBeVisible();
});

test("alerts page manages rules and resolves alert events", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  let rules = [
    {
      conditionType: "high_usage",
      enabled: true,
      id: "rule_existing",
      name: "Existing high usage",
      organizationId: "org_north",
      scopeType: "organization",
      threshold: 50,
      utilityType: "water",
      windowMinutes: 60,
    },
  ];
  await page.route("**/api/v1/alerts/rules", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as {
        name: string;
        threshold: number;
      };
      rules = [
        ...rules,
        {
          conditionType: "high_usage",
          enabled: true,
          id: "rule_created",
          name: body.name,
          organizationId: "org_north",
          scopeType: "organization",
          threshold: body.threshold,
          utilityType: "water",
          windowMinutes: 60,
        },
      ];
      await route.fulfill({
        body: JSON.stringify(rules.at(-1)),
        contentType: "application/json",
        status: 201,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ items: rules }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/alerts");

  await expect(
    page.getByRole("heading", { name: "Alert Rules" }),
  ).toBeVisible();
  await expect(page.getByText("Existing high usage")).toBeVisible();
  await page.getByLabel("Rule name").fill("Created leak watch");
  await page.getByLabel("Threshold").fill("25");
  await page.getByRole("button", { name: "Create rule" }).click();
  await expect(page.getByText("Created leak watch")).toBeVisible();

  await page
    .getByRole("row", { name: /Leak suspected/ })
    .getByRole("button", { name: "Resolve" })
    .click();
  await expect(
    page.getByRole("row", { name: /Leak suspected/ }).getByText("resolved"),
  ).toBeVisible();
});

test("reports page exposes CSV export and demo data controls seed data", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  let exportRequested = false;
  let seedRequested = false;
  await page.route(
    "**/api/v1/reports/monthly-usage/export**",
    async (route) => {
      exportRequested = true;
      await route.fulfill({
        body: "Building,Unit,Water (gal),Electric (kWh),Estimated cost\nNorth,101,10,5,1.25\n",
        contentType: "text/csv",
        headers: {
          "content-disposition":
            "attachment; filename=monthly-usage-2026-06.csv",
        },
        status: 200,
      });
    },
  );
  await page.route("**/api/v1/simulations/demo-seed", async (route) => {
    seedRequested = true;
    await route.fulfill({
      body: JSON.stringify({
        acceptedReadingCount: 3870,
        aggregateCount: 3956,
        alertEventCount: 3,
        alertRuleCount: 3,
        buildingCount: 3,
        duplicateReadingCount: 0,
        floorCount: 10,
        meterCount: 43,
        reportMonth: "2026-06",
        unitCount: 40,
      }),
      contentType: "application/json",
      status: 201,
    });
  });

  await page.goto("/reports");
  await page.getByRole("link", { name: "Download CSV" }).click();
  await expect.poll(() => exportRequested).toBe(true);

  await page.goto("/settings/demo-data");
  await page.getByRole("button", { name: "Seed demo data" }).click();
  await expect(page.getByText("Demo data seeded for 2026-06")).toBeVisible();
  await expect(page.getByText("40")).toBeVisible();
  await expect(page.getByText("43")).toBeVisible();
  expect(seedRequested).toBe(true);
});
