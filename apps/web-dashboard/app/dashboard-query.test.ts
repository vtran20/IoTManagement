import { describe, expect, it } from "vitest";
import {
  dashboardOverviewQueryKey,
  dashboardOverviewQueryRootKey,
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
});
