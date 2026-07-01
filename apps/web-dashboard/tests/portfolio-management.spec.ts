import { expect, test } from "@playwright/test";
import { mockAuthenticatedSession } from "./auth-fixture";

test("portfolio page creates and archives buildings locally", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.goto("/buildings");

  await page.getByLabel("Building name").fill("Cedar House");
  await page.getByLabel("Address").fill("44 Cedar St");
  await page.getByRole("button", { name: "Create building" }).click();
  await expect(page.getByRole("cell", { name: "Cedar House" })).toBeVisible();

  await page
    .getByRole("row", { name: /Lakeview Apartments/ })
    .getByRole("button", { name: "Archive" })
    .click();
  await expect(
    page
      .getByRole("row", { name: /Lakeview Apartments/ })
      .getByText("archived"),
  ).toBeVisible();
});

test("building, unit, and meter detail pages expose operational context", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);

  await page.goto("/buildings/building_north_ridge");
  await expect(
    page.getByRole("heading", {
      name: "North Ridge Mixed Use Building With A Very Long Operational Name",
    }),
  ).toBeVisible();
  await expect(page.getByText("Related units")).toBeVisible();
  await expect(
    page.getByText("Apartment 1201 With Long Tenant Label"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archive building" }).click();
  await expect(page.getByText("Archived building")).toBeVisible();
  await page.getByRole("button", { name: "Restore building" }).click();
  await expect(page.getByText("Active building")).toBeVisible();

  await page.goto("/units/unit_1201");
  await expect(
    page.getByRole("heading", {
      name: "Apartment 1201 With Long Tenant Label",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Main Water Riser Meter With Extremely Long Identifier"),
  ).toBeVisible();

  await page.goto("/meters/meter_water_1");
  await expect(
    page.getByRole("heading", {
      name: "Main Water Riser Meter With Extremely Long Identifier",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("nr-water-main-riser-meter-with-long-id-0001"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archive meter" }).click();
  await expect(page.getByText("Archived meter")).toBeVisible();
});
