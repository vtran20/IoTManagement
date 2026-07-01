import { expect, test } from "@playwright/test";
import { mockAuthenticatedSession } from "./auth-fixture";

test("monthly usage report shows totals and grouped unit rows", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.goto("/reports");

  await expect(
    page.getByRole("heading", { name: "Monthly Usage Report" }),
  ).toBeVisible();
  await expect(page.getByText("June 2026 utility usage")).toBeVisible();
  await expect(page.getByText("202,660 gal")).toBeVisible();
  await expect(page.getByText("71,935 kWh")).toBeVisible();
  await expect(page.getByText("$2,126.58")).toBeVisible();

  for (const columnName of [
    "Building",
    "Unit",
    "Water (gal)",
    "Electric (kWh)",
    "Estimated cost",
  ]) {
    await expect(
      page.getByRole("columnheader", { name: columnName }),
    ).toBeVisible();
  }

  await expect(
    page.getByText(
      "North Ridge Mixed Use Building With A Very Long Operational Name",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Apartment 1201 With Long Tenant Label"),
  ).toBeVisible();
  await expect(page.getByText("$1,284.40")).toBeVisible();
});

test("monthly usage report has a useful no-data state", async ({ page }) => {
  await mockAuthenticatedSession(page);
  await page.goto("/reports?state=empty");

  await expect(page.getByText("No report data yet")).toBeVisible();
  await expect(
    page.getByText("Seed demo data or run monthly aggregation"),
  ).toBeVisible();
});
