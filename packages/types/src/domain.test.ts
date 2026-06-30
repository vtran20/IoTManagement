import { describe, expect, it } from "vitest";
import {
  aggregatePeriodTypes,
  alertConditionTypes,
  alertSeverities,
  alertStatuses,
  alertScopeTypes,
  meterSources,
  meterStatuses,
  readingKinds,
  readingQualities,
  readingUnits,
  userRoles,
  utilityTypes,
} from "./domain";

describe("domain enums", () => {
  it("keeps shared utility and meter values stable", () => {
    expect(utilityTypes).toEqual(["water", "electric"]);
    expect(meterSources).toEqual([
      "simulated",
      "gateway",
      "direct_api",
      "mqtt",
    ]);
    expect(meterStatuses).toEqual(["online", "offline", "stale", "disabled"]);
  });

  it("keeps shared reading values stable", () => {
    expect(readingUnits).toEqual(["gallon", "liter", "kwh"]);
    expect(readingKinds).toEqual(["cumulative", "interval"]);
    expect(readingQualities).toEqual([
      "good",
      "estimated",
      "duplicate",
      "invalid",
    ]);
  });

  it("keeps shared user, aggregate, and alert values stable", () => {
    expect(userRoles).toEqual(["owner", "manager", "viewer", "tenant"]);
    expect(aggregatePeriodTypes).toEqual(["hour", "day", "month"]);
    expect(alertScopeTypes).toEqual([
      "organization",
      "building",
      "unit",
      "meter",
    ]);
    expect(alertConditionTypes).toEqual([
      "high_usage",
      "leak_suspected",
      "stale_device",
      "outage_suspected",
    ]);
    expect(alertSeverities).toEqual(["info", "warning", "critical"]);
    expect(alertStatuses).toEqual(["open", "acknowledged", "resolved"]);
  });
});
