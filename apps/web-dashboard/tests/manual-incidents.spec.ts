import { expect, test } from "@playwright/test";
import { mockAuthenticatedSession } from "./auth-fixture";

test("owners can create a manual incident from the incident queue", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);

  let requestBody: Record<string, unknown> | undefined;
  await page.route("**/api/v1/incidents/manual", async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({
        ...requestBody,
        detectedAt: "2026-07-05T14:00:00.000Z",
        id: "incident_manual_report",
        organizationId: "org_north",
        source: "manual_report",
        status: "open",
      }),
      contentType: "application/json",
      status: 201,
    });
  });

  await page.goto("/incidents");

  await page.getByRole("button", { name: "Create incident" }).click();
  await page.getByLabel("Building").selectOption("building_north_ridge");
  await page.getByLabel("Unit").selectOption("unit_1201");
  await page.getByLabel("Meter").selectOption("meter_water_1");
  await page.getByLabel("Severity").selectOption("critical");
  await page
    .getByLabel("Incident title")
    .fill("Resident water report in unit 1201");
  await page
    .getByLabel("Incident description")
    .fill("Resident reported water below the kitchen sink.");

  await page.getByRole("button", { name: "Open incident" }).click();

  await expect
    .poll(() => requestBody)
    .toEqual({
      buildingId: "building_north_ridge",
      description: "Resident reported water below the kitchen sink.",
      meterId: "meter_water_1",
      severity: "critical",
      title: "Resident water report in unit 1201",
      unitId: "unit_1201",
    });
  await page.waitForURL("**/incidents/incident_manual_report");
});

test("viewers can inspect the incident queue without creating an incident", async ({
  page,
}) => {
  await mockAuthenticatedSession(page, { role: "viewer" });

  await page.goto("/incidents");

  await expect(
    page.getByRole("button", { name: "Create incident" }),
  ).toHaveCount(0);
});
