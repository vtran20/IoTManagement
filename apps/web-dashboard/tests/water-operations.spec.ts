import { expect, type Page, test } from "@playwright/test";
import { mockAuthenticatedSession } from "./auth-fixture";

const incident = {
  buildingId: "building_north_ridge",
  description: "Continuous water usage detected below the bathroom vanity.",
  detectedAt: "2026-07-03T10:00:00.000Z",
  id: "incident_bathroom_leak",
  organizationId: "org_north",
  severity: "critical",
  source: "meter_anomaly",
  status: "investigating",
  title: "Bathroom continuous flow",
  unitId: "unit_1201",
};

const workOrder = {
  assignedMembershipId: "membership_north_manager",
  buildingId: incident.buildingId,
  createdAt: "2026-07-03T10:05:00.000Z",
  description: "Inspect the supply line and replace the failed fitting.",
  dueAt: "2026-07-04T10:00:00.000Z",
  id: "work_order_bathroom_leak",
  incidentId: incident.id,
  isOverdue: false,
  organizationId: "org_north",
  priority: "critical",
  status: "assigned",
  title: "Repair bathroom supply line",
  unitId: incident.unitId,
  updatedAt: "2026-07-03T10:05:00.000Z",
};

async function mockWaterOperations(page: Page) {
  await page.route("**/api/v1/incidents", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ items: [incident] }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(`**/api/v1/incidents/${incident.id}`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        ...incident,
        activities: [
          {
            actorUserId: "user_north_owner",
            createdAt: incident.detectedAt,
            id: "activity_opened",
            incidentId: incident.id,
            organizationId: "org_north",
            summary: "Continuous flow incident opened",
            type: "opened",
          },
        ],
        evidence: [
          {
            createdAt: incident.detectedAt,
            id: "evidence_flow_window",
            incidentId: incident.id,
            meterId: "meter_water_1",
            observedUsage: 28,
            organizationId: "org_north",
            policyId: "policy_water_flow",
            readingIds: ["reading_1", "reading_2"],
            thresholdUsage: 10,
            windowEndedAt: "2026-07-03T10:00:00.000Z",
            windowStartedAt: "2026-07-03T09:30:00.000Z",
          },
        ],
        workOrders: [workOrder],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/work-orders", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ items: [workOrder] }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(`**/api/v1/work-orders/${workOrder.id}`, async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as { status?: string };
    await route.fulfill({
      body: JSON.stringify({
        ...workOrder,
        status: body.status ?? workOrder.status,
        updatedAt: "2026-07-03T10:15:00.000Z",
      }),
      contentType: "application/json",
      status: 200,
    });
  });
}

test("water incidents link to evidence and repair work", async ({ page }) => {
  await mockAuthenticatedSession(page);
  await mockWaterOperations(page);

  await page.goto("/incidents");

  await expect(
    page.getByRole("heading", { level: 2, name: "Water Incidents" }),
  ).toBeVisible();
  await expect(page.getByText("Bathroom continuous flow")).toBeVisible();
  await expect(page.getByText("critical")).toBeVisible();

  await page.getByRole("link", { name: "Bathroom continuous flow" }).click();
  await expect(
    page.getByRole("heading", { name: "Bathroom continuous flow" }),
  ).toBeVisible();
  await expect(page.getByText("Meter evidence")).toBeVisible();
  await expect(page.getByText("Repair bathroom supply line")).toBeVisible();
  await expect(page.getByText("Continuous flow incident opened")).toBeVisible();
});

test("work-order actions are available to owners and hidden from viewers", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await mockWaterOperations(page);
  await page.goto("/work-orders");

  await expect(page.getByText("Repair bathroom supply line")).toBeVisible();
  await page.getByRole("button", { name: "Start work" }).click();
  await expect(page.getByText("in_progress")).toBeVisible();
  await page
    .getByLabel("Completion note")
    .fill("Replaced the failed fitting and confirmed no active flow.");
  await page.getByLabel("Final cost").fill("250");
  await page.getByRole("button", { name: "Complete work" }).click();
  await expect(
    page.getByRole("cell", { name: "completed", exact: true }),
  ).toBeVisible();

  await page.unroute("http://127.0.0.1:3001/api/v1/auth/me");
  await mockAuthenticatedSession(page, { role: "viewer" });
  await page.goto("/work-orders");
  await expect(page.getByText("Read only")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start work" })).toHaveCount(0);
});
