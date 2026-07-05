import { describe, expect, it } from "vitest";
import {
  dashboardOperationsQueryKey,
  dashboardOperationsQueryRootKey,
  dashboardOverviewQueryKey,
  dashboardOverviewQueryRootKey,
  invalidateDashboardQueries,
} from "../lib/dashboard-query";

describe("dashboardOverviewQueryKey", () => {
  it("uses one stable cache key per normalized dashboard filter set", () => {
    expect(
      dashboardOverviewQueryKey({
        buildingId: "building_north",
        utilityType: "water",
      }),
    ).toEqual([
      "dashboard",
      "overview",
      { buildingId: "building_north", utilityType: "water" },
    ]);
  });

  it("exposes a root key for invalidating every overview filter variant", () => {
    expect(dashboardOverviewQueryRootKey).toEqual(["dashboard", "overview"]);
  });

  it("uses a stable root key for the operations queue", () => {
    expect(dashboardOperationsQueryKey).toEqual(["dashboard", "operations"]);
    expect(dashboardOperationsQueryRootKey).toEqual([
      "dashboard",
      "operations",
    ]);
  });

  it("invalidates analytics and operations after an operational mutation", async () => {
    const queryKeys: unknown[] = [];

    await invalidateDashboardQueries({
      invalidateQueries: ({ queryKey }: { queryKey: unknown }) => {
        queryKeys.push(queryKey);
        return Promise.resolve();
      },
    });

    expect(queryKeys).toEqual([
      dashboardOverviewQueryRootKey,
      dashboardOperationsQueryRootKey,
    ]);
  });
});
