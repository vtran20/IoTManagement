import { expect, test } from "@playwright/test";
import { authUser, mockAuthenticatedSession } from "./auth-fixture";

test("app shell navigation exposes core operations pages", async ({ page }) => {
  await mockAuthenticatedSession(page);
  await page.goto("/dashboard");
  const navigation = page
    .locator(".sidebar")
    .getByRole("navigation", { name: "Operations" });

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Dashboard" }),
  ).toHaveAttribute("aria-current", "page");
  for (const name of [
    "Dashboard",
    "Buildings",
    "Units",
    "Meters",
    "Alerts",
    "Reports",
    "Settings",
  ]) {
    await expect(navigation.getByRole("link", { name })).toBeVisible();
  }

  await navigation.getByRole("link", { name: "Meters" }).click();
  await expect(page).toHaveURL(/\/meters$/);
  await expect(page.getByRole("heading", { name: "Meters" })).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Meters" }),
  ).toHaveAttribute("aria-current", "page");
});

test("app shell keeps navigation reachable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await mockAuthenticatedSession(page);
  await page.goto("/dashboard");

  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open navigation" }).click();
  const mobileNavigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });
  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Dashboard" }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Meters" }),
  ).toBeVisible();

  await page.mouse.click(360, 120);
  await expect(mobileNavigation).toBeHidden();
});

test("app shell keeps desktop sidebar visible on wide screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockAuthenticatedSession(page);
  await page.goto("/dashboard");

  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeHidden();
});

test("login handles bad credentials and successful owner login", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:3001/api/v1/auth/login", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as { password?: string };
    await route.fulfill({
      body: JSON.stringify(
        body.password === "password123" ? { user: authUser.user } : {},
      ),
      contentType: "application/json",
      headers:
        body.password === "password123"
          ? {
              "set-cookie":
                "iot_management_session=playwright-session; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax",
            }
          : undefined,
      status: body.password === "password123" ? 201 : 401,
    });
  });
  await page.route("http://127.0.0.1:3001/api/v1/auth/me", async (route) => {
    await route.fulfill({
      body: JSON.stringify(authUser),
      contentType: "application/json",
      status: 200,
    });
  });
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
  await mockAuthenticatedSession(page);
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

test("overview prioritizes operations and removes placeholder topbar controls", async ({
  page,
}) => {
  await mockAuthenticatedSession(page);
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Critical alerts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Incidents without repair" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Overdue work" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Devices offline" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Operations Today" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review repair" }),
  ).toHaveAttribute("href", "/work-orders/work_order_overdue");
  await expect(page.getByRole("button", { name: "Search" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export" })).toHaveCount(0);
});

test("operations overview remains contained across target viewports", async ({
  page,
}) => {
  for (const [width, expectedColumns] of [
    [1440, 4],
    [1024, 2],
    [390, 1],
  ] as const) {
    await page.setViewportSize({ height: 900, width });
    await mockAuthenticatedSession(page);
    await page.goto("/dashboard");

    await expect(page.locator(".operations-metric-strip")).toBeVisible();
    expect(
      await page
        .locator(".operations-metric-strip")
        .evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/)
              .length,
        ),
    ).toBe(expectedColumns);
    const viewport = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      windowWidth: window.innerWidth,
    }));
    expect(
      viewport.documentWidth,
      `expected no document overflow at ${width}px`,
    ).toBeLessThanOrEqual(viewport.windowWidth);
  }
});

test("portfolio tables stay readable with long names", async ({ page }) => {
  await mockAuthenticatedSession(page);
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
  await mockAuthenticatedSession(page);
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

test("protected routes redirect to login without a session cookie", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test("logout clears dashboard access", async ({ page }) => {
  await mockAuthenticatedSession(page);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
