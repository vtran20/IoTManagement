import { describe, expect, it } from "vitest";
import { isNavigationItemActive } from "../components/nav";

describe("isNavigationItemActive", () => {
  it("matches an exact section route", () => {
    expect(isNavigationItemActive("/incidents", "/incidents")).toBe(true);
    expect(isNavigationItemActive("/incidents", "/buildings")).toBe(false);
  });

  it("matches nested routes only within the same section", () => {
    expect(
      isNavigationItemActive("/buildings/building_north_ridge", "/buildings"),
    ).toBe(true);
    expect(
      isNavigationItemActive("/incidents/incident_123", "/incidents"),
    ).toBe(true);
    expect(
      isNavigationItemActive("/incidents/incident_123", "/buildings"),
    ).toBe(false);
  });
});
