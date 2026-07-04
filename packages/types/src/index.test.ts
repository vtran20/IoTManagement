import { describe, expect, it } from "vitest";
import { leakAnalyticsPeriods, platformName, reportFormats } from "./index";

describe("platformName", () => {
  it("identifies the shared IoT platform", () => {
    expect(platformName).toBe("IoT Management");
  });
});

describe("leak analytics contracts", () => {
  it("exposes supported report formats and analysis periods", () => {
    expect(reportFormats).toEqual(["csv", "pdf", "json"]);
    expect(leakAnalyticsPeriods).toEqual(["7d", "30d", "90d"]);
  });
});
