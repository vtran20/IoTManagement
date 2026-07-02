import type { Page } from "@playwright/test";
import type {
  AlertEvent,
  AlertRule,
  Building,
  Meter,
  Unit,
} from "@iot-management/types";
import {
  alerts as fixtureAlerts,
  buildings as fixtureBuildings,
  meters as fixtureMeters,
  monthlyUsageReport,
  units as fixtureUnits,
} from "../lib/api";

type MockMeter = Meter & { label?: string; supportedReadingUnits?: string[] };

export const authUser = {
  membership: {
    id: "membership_north_owner",
    organizationId: "org_north",
    role: "owner",
    userId: "user_north_owner",
  },
  organization: {
    createdAt: "2026-06-29T00:00:00.000Z",
    id: "org_north",
    name: "North Properties",
    status: "active",
  },
  user: {
    createdAt: "2026-06-29T00:00:00.000Z",
    email: "owner@north.example",
    id: "user_north_owner",
    name: "North Owner",
  },
};

export async function mockAuthenticatedSession(
  page: Page,
  options: { role?: "owner" | "manager" | "viewer" } = {},
) {
  let buildings: Building[] = fixtureBuildings.map((building) => ({
    ...building,
    lifecycleStatus: building.lifecycleStatus ?? "active",
  }));
  let meters: MockMeter[] = fixtureMeters.map((meter) => ({
    ...meter,
    lifecycleStatus: "active",
    organizationId: "org_north",
    source: "simulated" as const,
    supportedReadingUnits:
      meter.utilityType === "water" ? ["gallon", "liter"] : ["kwh"],
  }));
  let alerts: AlertEvent[] = fixtureAlerts.map((alert) => ({ ...alert }));
  let rates = {
    electricPerKwh: 0.15,
    organizationId: "org_north",
    waterPerGallon: 0.005,
  };
  let rules: AlertRule[] = [
    {
      conditionType: "high_usage",
      enabled: true,
      id: "rule_high_usage",
      name: "High water usage",
      organizationId: "org_north",
      scopeType: "organization",
      threshold: 100,
      utilityType: "water",
      windowMinutes: 60,
    },
  ];
  const units: Unit[] = fixtureUnits.map((unit) => ({
    ...unit,
    lifecycleStatus: unit.lifecycleStatus ?? "active",
  }));
  const responseUser = {
    ...authUser,
    membership: {
      ...authUser.membership,
      role: options.role ?? authUser.membership.role,
    },
  };
  await page.context().addCookies([
    {
      domain: "127.0.0.1",
      httpOnly: true,
      name: "iot_management_session",
      path: "/",
      sameSite: "Lax",
      value: "playwright-session",
    },
  ]);
  await page.route("http://127.0.0.1:3001/api/v1/auth/me", async (route) => {
    await route.fulfill({
      body: JSON.stringify(responseUser),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("http://127.0.0.1:3001/api/v1/auth/csrf", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ csrfToken: "playwright-csrf" }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(
    "http://127.0.0.1:3001/api/v1/auth/logout",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ success: true }),
        contentType: "application/json",
        headers: {
          "set-cookie":
            "iot_management_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
        },
        status: 201,
      });
    },
  );
  await page.route("**/api/v1/dashboard/summary", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        criticalAlertCount: 1,
        generatedAt: "2026-06-30T12:00:00.000Z",
        offlineMeterCount: 1,
        openAlertCount: 2,
        organizationId: "org_north",
        staleMeterCount: 1,
        utilitySummaries: [
          { costEstimate: 1284.4, usageValue: 128440, utilityType: "water" },
          {
            costEstimate: 842.18,
            usageValue: 42817,
            utilityType: "electric",
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
              buildingId: buildings[0]?.id ?? "building_north_ridge",
              buildingName: buildings[0]?.name ?? "North Ridge",
              costEstimate: 1284.4,
              usageValue: 128440,
              utilityType: "water",
            },
            {
              buildingId: buildings[1]?.id ?? "building_lakeview",
              buildingName: buildings[1]?.name ?? "Lakeview Apartments",
              costEstimate: 842.18,
              usageValue: 42817,
              utilityType: "electric",
            },
          ],
        },
        deviceHealth: {
          meters: meters.map((meter) => ({
            externalId: meter.externalId,
            lastReadingAt: meter.lastReadingAt,
            meterId: meter.id,
            status: meter.status,
            utilityType: meter.utilityType,
          })),
        },
        range: {
          from: "2026-05-31T00:00:00.000Z",
          periodType: "day",
          to: "2026-06-30T00:00:00.000Z",
        },
        summary: {
          criticalAlertCount: 1,
          generatedAt: "2026-06-30T12:00:00.000Z",
          offlineMeterCount: 1,
          openAlertCount: 2,
          organizationId: "org_north",
          staleMeterCount: 1,
          utilitySummaries: [
            { costEstimate: 1284.4, usageValue: 128440, utilityType: "water" },
            {
              costEstimate: 842.18,
              usageValue: 42817,
              utilityType: "electric",
            },
          ],
        },
        trends: {
          items: [
            {
              costEstimate: 212.22,
              periodEnd: "2026-06-02T00:00:00.000Z",
              periodStart: "2026-06-01T00:00:00.000Z",
              usageValue: 128440,
              utilityType: "water",
            },
            {
              costEstimate: 188.3,
              periodEnd: "2026-06-02T00:00:00.000Z",
              periodStart: "2026-06-01T00:00:00.000Z",
              usageValue: 42817,
              utilityType: "electric",
            },
          ],
        },
        units: {
          items: [
            {
              buildingId: buildings[0]?.id ?? "building_north_ridge",
              buildingName: buildings[0]?.name ?? "North Ridge",
              unitId: units[0]?.id ?? "unit_1201",
              unitName: units[0]?.name ?? "Apartment 1201",
              usageValue: 128440,
              utilityType: "water",
            },
          ],
        },
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/settings/rates", async (route) => {
    if (route.request().method() === "PATCH") {
      rates = {
        ...rates,
        ...(route.request().postDataJSON() as typeof rates),
      };
      await route.fulfill({
        body: JSON.stringify(rates),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify(rates),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/dashboard/trends**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            costEstimate: 212.22,
            periodEnd: "2026-06-02T00:00:00.000Z",
            periodStart: "2026-06-01T00:00:00.000Z",
            usageValue: 128440,
            utilityType: "water",
          },
          {
            costEstimate: 188.3,
            periodEnd: "2026-06-02T00:00:00.000Z",
            periodStart: "2026-06-01T00:00:00.000Z",
            usageValue: 42817,
            utilityType: "electric",
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
            buildingId: buildings[0]?.id ?? "building_north_ridge",
            buildingName: buildings[0]?.name ?? "North Ridge",
            costEstimate: 1284.4,
            usageValue: 128440,
            utilityType: "water",
          },
          {
            buildingId: buildings[1]?.id ?? "building_lakeview",
            buildingName: buildings[1]?.name ?? "Lakeview Apartments",
            costEstimate: 842.18,
            usageValue: 42817,
            utilityType: "electric",
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
            buildingId: buildings[0]?.id ?? "building_north_ridge",
            buildingName: buildings[0]?.name ?? "North Ridge",
            unitId: units[0]?.id ?? "unit_1201",
            unitName: units[0]?.name ?? "Apartment 1201",
            usageValue: 128440,
            utilityType: "water",
          },
          {
            buildingId: buildings[0]?.id ?? "building_north_ridge",
            buildingName: buildings[0]?.name ?? "North Ridge",
            unitId: units[0]?.id ?? "unit_1201",
            unitName: units[0]?.name ?? "Apartment 1201",
            usageValue: 42817,
            utilityType: "electric",
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
        meters: meters.map((meter) => ({
          externalId: meter.externalId,
          lastReadingAt: meter.lastReadingAt,
          meterId: meter.id,
          status: meter.status,
          utilityType: meter.utilityType,
        })),
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/buildings", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Partial<Building>;
      const building: Building = {
        address: body.address,
        id: `building_${String(body.name ?? "new")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")}`,
        lifecycleStatus: "active",
        name: String(body.name),
        organizationId: "org_north",
        timezone: String(body.timezone ?? "America/Detroit"),
      };
      buildings = [...buildings, building];
      await route.fulfill({
        body: JSON.stringify(building),
        contentType: "application/json",
        status: 201,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({ items: buildings }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/buildings/*", async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split("/");
    const buildingId = parts.at(-1) ?? "";
    const building = buildings.find((item) => item.id === buildingId);
    if (!building) {
      await route.fulfill({
        body: JSON.stringify({ error: { message: "Building not found" } }),
        contentType: "application/json",
        status: 404,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        ...building,
        building,
        floors: [],
        meters: meters.filter((meter) => meter.buildingId === building.id),
        units: units.filter((unit) => unit.buildingId === building.id),
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/buildings/*/archive", async (route) => {
    const buildingId = route.request().url().split("/").at(-2);
    buildings = setLifecycle(buildings, buildingId, "archived");
    await route.fulfill({
      body: JSON.stringify(buildings.find((item) => item.id === buildingId)),
      contentType: "application/json",
      status: 201,
    });
  });
  await page.route("**/api/v1/buildings/*/restore", async (route) => {
    const buildingId = route.request().url().split("/").at(-2);
    buildings = setLifecycle(buildings, buildingId, "active");
    await route.fulfill({
      body: JSON.stringify(buildings.find((item) => item.id === buildingId)),
      contentType: "application/json",
      status: 201,
    });
  });
  await page.route("**/api/v1/units**", async (route) => {
    const url = new URL(route.request().url());
    const buildingId = url.searchParams.get("buildingId");
    await route.fulfill({
      body: JSON.stringify({
        items: buildingId
          ? units.filter((unit) => unit.buildingId === buildingId)
          : units,
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/units/*", async (route) => {
    const unitId = route.request().url().split("/").at(-1);
    await route.fulfill({
      body: JSON.stringify(units.find((unit) => unit.id === unitId)),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/meters**", async (route) => {
    const url = new URL(route.request().url());
    const unitId = url.searchParams.get("unitId");
    const buildingId = url.searchParams.get("buildingId");
    await route.fulfill({
      body: JSON.stringify({
        items: meters.filter((meter) => {
          if (unitId && meter.unitId !== unitId) return false;
          if (buildingId && meter.buildingId !== buildingId) return false;
          return true;
        }),
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/meters/*/archive", async (route) => {
    const meterId = route.request().url().split("/").at(-2);
    meters = setLifecycle(meters, meterId, "archived");
    await route.fulfill({
      body: JSON.stringify(meters.find((item) => item.id === meterId)),
      contentType: "application/json",
      status: 201,
    });
  });
  await page.route("**/api/v1/meters/*/restore", async (route) => {
    const meterId = route.request().url().split("/").at(-2);
    meters = setLifecycle(meters, meterId, "active");
    await route.fulfill({
      body: JSON.stringify(meters.find((item) => item.id === meterId)),
      contentType: "application/json",
      status: 201,
    });
  });
  await page.route("**/api/v1/meters/*", async (route) => {
    const meterId = route.request().url().split("/").at(-1);
    await route.fulfill({
      body: JSON.stringify(meters.find((meter) => meter.id === meterId)),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/alerts", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ items: alerts }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/alerts/rules", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as {
        name: string;
        threshold?: number;
      };
      const rule: AlertRule = {
        conditionType: "high_usage",
        enabled: true,
        id: `rule_${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: body.name,
        organizationId: "org_north",
        scopeType: "organization",
        threshold: body.threshold,
        utilityType: "water",
        windowMinutes: 60,
      };
      rules = [...rules, rule];
      await route.fulfill({
        body: JSON.stringify(rule),
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
  await page.route("**/api/v1/alerts/*/acknowledge", async (route) => {
    const alertId = route.request().url().split("/").at(-2);
    alerts = alerts.map((alert) =>
      alert.id === alertId
        ? {
            ...alert,
            acknowledgedAt: "2026-06-30T12:05:00.000Z",
            status: "acknowledged",
          }
        : alert,
    );
    await route.fulfill({
      body: JSON.stringify(alerts.find((alert) => alert.id === alertId)),
      contentType: "application/json",
      status: 201,
    });
  });
  await page.route("**/api/v1/alerts/*/resolve", async (route) => {
    const alertId = route.request().url().split("/").at(-2);
    alerts = alerts.map((alert) =>
      alert.id === alertId
        ? {
            ...alert,
            resolvedAt: "2026-06-30T12:10:00.000Z",
            status: "resolved",
          }
        : alert,
    );
    await route.fulfill({
      body: JSON.stringify(alerts.find((alert) => alert.id === alertId)),
      contentType: "application/json",
      status: 201,
    });
  });
  await page.route("**/api/v1/reports/monthly-usage**", async (route) => {
    if (route.request().url().includes("/export")) {
      await route.fulfill({
        body: "Building,Unit,Water (gal),Electric (kWh),Estimated cost\nNorth,101,10,5,1.25\n",
        contentType: "text/csv",
        headers: {
          "content-disposition":
            "attachment; filename=monthly-usage-2026-06.csv",
        },
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify(monthlyUsageReport),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route("**/api/v1/simulations/demo-seed", async (route) => {
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
}

function setLifecycle<T extends Building | Unit | Meter>(
  items: T[],
  id: string | undefined,
  lifecycleStatus: "active" | "archived",
): T[] {
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          archivedAt:
            lifecycleStatus === "archived"
              ? "2026-06-30T12:00:00.000Z"
              : undefined,
          lifecycleStatus,
        }
      : item,
  );
}
