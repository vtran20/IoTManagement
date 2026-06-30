import { expect, test } from "@playwright/test";

test("alerts can be acknowledged from the UI", async ({ page }) => {
  await page.goto("/alerts");

  await expect(page.getByRole("heading", { name: "Alerts" })).toBeVisible();
  await expect(page.getByText("Leak suspected")).toBeVisible();

  await page
    .getByRole("row", { name: /Leak suspected/ })
    .getByRole("button", { name: "Acknowledge" })
    .click();

  await expect(
    page.getByRole("row", { name: /Leak suspected/ }).getByText("acknowledged"),
  ).toBeVisible();
});
