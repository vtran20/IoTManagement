import type { DashboardOperationsResponse } from "@iot-management/types";
import { describe, expect, it } from "vitest";
import { operationSummaryCards } from "../features/dashboard/operations-summary";

describe("operationSummaryCards", () => {
  it("uses truthful operational labels and destinations", () => {
    const cards = operationSummaryCards({
      criticalAlertCount: 2,
      generatedAt: "2026-07-05T12:00:00.000Z",
      incidentsWithoutRepairCount: 1,
      items: [],
      offlineMeterCount: 3,
      organizationId: "org_north",
      overdueWorkOrderCount: 4,
    } satisfies DashboardOperationsResponse);

    expect(cards).toEqual([
      expect.objectContaining({
        href: "/alerts",
        label: "Critical alerts",
        support: "Respond now",
        value: "2",
      }),
      expect.objectContaining({
        href: "/incidents",
        label: "Incidents without repair",
        support: "Needs repair planning",
        value: "1",
      }),
      expect.objectContaining({
        href: "/work-orders?overdue=true",
        label: "Overdue work",
        support: "Vendor or team follow-up",
        value: "4",
      }),
      expect.objectContaining({
        href: "/meters",
        label: "Devices offline",
        support: "Inspect meter connectivity",
        value: "3",
      }),
    ]);
  });
});
