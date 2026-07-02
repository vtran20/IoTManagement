import { expect, test } from "@playwright/test";
import { mockAuthenticatedSession } from "./auth-fixture";

test("dashboard renders API data instead of static fixture values", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.route("**/api/v1/dashboard/summary", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        criticalAlertCount: 1,
        generatedAt: "2026-06-30T12:00:00.000Z",
        offlineMeterCount: 2,
        openAlertCount: 7,
        organizationId: "org_north",
        staleMeterCount: 3,
        utilitySummaries: [
          { costEstimate: 88.12, usageValue: 4321, utilityType: "water" },
          { costEstimate: 901.33, usageValue: 6543, utilityType: "electric" },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/dashboard/trends**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            costEstimate: 88.12,
            periodEnd: "2026-06-01T01:00:00.000Z",
            periodStart: "2026-06-01T00:00:00.000Z",
            usageValue: 4321,
            utilityType: "water",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/dashboard/buildings**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            buildingId: "building_api",
            buildingName: "API Tower",
            costEstimate: 88.12,
            usageValue: 4321,
            utilityType: "water",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/dashboard/units**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            buildingId: "building_api",
            buildingName: "API Tower",
            unitId: "unit_api",
            unitName: "API Unit 501",
            usageValue: 987,
            utilityType: "water",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/dashboard/device-health", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        meters: [
          {
            externalId: "api-meter-stale",
            meterId: "meter_api",
            status: "stale",
            utilityType: "water",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.route("**/api/v1/dashboard/overview**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        buildings: {
          items: [
            {
              buildingId: "building_api",
              buildingName: "API Tower",
              costEstimate: 88.12,
              usageValue: 4321,
              utilityType: "water",
            },
          ],
        },
        deviceHealth: {
          meters: [
            {
              externalId: "api-meter-stale",
              meterId: "meter_api",
              status: "stale",
              utilityType: "water",
            },
          ],
        },
        range: {
          from: "2026-06-01T00:00:00.000Z",
          periodType: "day",
          to: "2026-07-01T00:00:00.000Z",
        },
        summary: {
          criticalAlertCount: 1,
          generatedAt: "2026-06-30T12:00:00.000Z",
          offlineMeterCount: 2,
          openAlertCount: 7,
          organizationId: "org_north",
          staleMeterCount: 3,
          utilitySummaries: [
            { costEstimate: 88.12, usageValue: 4321, utilityType: "water" },
            { costEstimate: 901.33, usageValue: 6543, utilityType: "electric" },
          ],
        },
        trends: {
          items: [
            {
              costEstimate: 88.12,
              periodEnd: "2026-06-01T01:00:00.000Z",
              periodStart: "2026-06-01T00:00:00.000Z",
              usageValue: 4321,
              utilityType: "water",
            },
          ],
        },
        units: {
          items: [
            {
              buildingId: "building_api",
              buildingName: "API Tower",
              unitId: "unit_api",
              unitName: "API Unit 501",
              usageValue: 987,
              utilityType: "water",
            },
          ],
        },
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  const dashboardRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/dashboard/")) {
      dashboardRequests.push(request.url());
    }
  });

  await page.goto("/dashboard");

  await expect(page.getByText("4,321 gal")).toBeVisible();
  await expect(page.getByText("6,543 kWh")).toBeVisible();
  await expect(page.getByText("2 offline / 3 stale")).toBeVisible();
  await expect(page.getByText("API Tower")).toBeVisible();
  await expect(page.getByText("API Unit 501")).toBeVisible();
  await expect(page.getByText("128,440 gal")).not.toBeVisible();
  expect(dashboardRequests).toEqual([
    expect.stringContaining("/api/v1/dashboard/overview"),
  ]);
});

test("portfolio inventory pages render API data and viewer role hides mutations", async ({
  page,
}) => {
  await mockAuthenticatedSession(page, { role: "viewer" });
  await page.route("**/api/v1/buildings", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            address: "77 API Ave",
            id: "building_api",
            lifecycleStatus: "active",
            name: "API Building",
            organizationId: "org_north",
            timezone: "America/Detroit",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/meters", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            buildingId: "building_api",
            externalId: "api-meter-001",
            id: "meter_api",
            organizationId: "org_north",
            source: "simulated",
            status: "online",
            supportedReadingUnits: ["gallon", "liter"],
            utilityType: "water",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/units**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            buildingId: "building_api",
            id: "unit_api",
            name: "API Unit 101",
            occupancyStatus: "occupied",
            organizationId: "org_north",
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/buildings");
  await expect(page.getByRole("cell", { name: "API Building" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create building" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archive" })).toHaveCount(0);

  await page.goto("/units");
  await expect(page.getByText("API Unit 101")).toBeVisible();

  await page.goto("/meters");
  await expect(page.getByText("api-meter-001")).toBeVisible();
});
