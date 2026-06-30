import { describe, expect, it } from "vitest";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { AlertEvaluatorService } from "./alert-evaluator.service";

describe("AlertEvaluatorService", () => {
  it("creates one high-usage alert and does not duplicate an open alert", () => {
    const { evaluator, persistence } = createFixture();
    const building = persistence.createBuilding({
      name: "Alert Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const meter = persistence.createMeter({
      buildingId: building.id,
      externalId: "high-water",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    persistence.createUsageAggregate({
      buildingId: building.id,
      meterId: meter.id,
      organizationId: "org_north",
      periodEnd: "2026-06-29T11:00:00.000Z",
      periodStart: "2026-06-29T10:00:00.000Z",
      periodType: "hour",
      usageValue: 25,
      utilityType: "water",
    });
    persistence.createAlertRule({
      conditionType: "high_usage",
      enabled: true,
      name: "High water",
      organizationId: "org_north",
      scopeType: "organization",
      threshold: 10,
      utilityType: "water",
      windowMinutes: 60,
    });

    const first = evaluator.evaluate({
      now: "2026-06-29T11:00:00.000Z",
      organizationId: "org_north",
    });
    const second = evaluator.evaluate({
      now: "2026-06-29T11:05:00.000Z",
      organizationId: "org_north",
    });

    expect(first.createdCount).toBe(1);
    expect(second.createdCount).toBe(0);
    expect(
      persistence.listAlertEvents({ organizationId: "org_north" }),
    ).toHaveLength(1);
  });

  it("does not trigger disabled rules", () => {
    const { evaluator, persistence } = createFixture();
    persistence.createAlertRule({
      conditionType: "high_usage",
      enabled: false,
      name: "Disabled",
      organizationId: "org_north",
      scopeType: "organization",
      threshold: 1,
      windowMinutes: 60,
    });

    const result = evaluator.evaluate({
      now: "2026-06-29T11:00:00.000Z",
      organizationId: "org_north",
    });

    expect(result.createdCount).toBe(0);
  });

  it("detects suspected leaks from continuous water usage", () => {
    const { evaluator, persistence } = createFixture();
    const building = persistence.createBuilding({
      name: "Leak Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    const meter = persistence.createMeter({
      buildingId: building.id,
      externalId: "leak-water",
      organizationId: "org_north",
      source: "simulated",
      utilityType: "water",
    });
    for (const [periodStart, usageValue] of [
      ["2026-06-29T00:00:00.000Z", 1.2],
      ["2026-06-29T01:00:00.000Z", 1.1],
      ["2026-06-29T02:00:00.000Z", 1.3],
    ] as const) {
      persistence.createUsageAggregate({
        buildingId: building.id,
        meterId: meter.id,
        organizationId: "org_north",
        periodEnd: nextHour(periodStart),
        periodStart,
        periodType: "hour",
        usageValue,
        utilityType: "water",
      });
    }
    persistence.createAlertRule({
      conditionType: "leak_suspected",
      enabled: true,
      name: "Leak",
      organizationId: "org_north",
      scopeType: "organization",
      threshold: 0.5,
      utilityType: "water",
      windowMinutes: 180,
    });

    const result = evaluator.evaluate({
      now: "2026-06-29T03:00:00.000Z",
      organizationId: "org_north",
    });

    expect(result.createdCount).toBe(1);
    expect(result.events[0]).toMatchObject({
      severity: "critical",
      title: "Leak suspected",
    });
  });

  it("detects stale and outage device conditions", () => {
    const { evaluator, persistence } = createFixture();
    const building = persistence.createBuilding({
      name: "Device Tower",
      organizationId: "org_north",
      timezone: "America/Detroit",
    });
    persistence.createMeter({
      buildingId: building.id,
      externalId: "stale-meter",
      lastReadingAt: "2026-06-29T08:00:00.000Z",
      organizationId: "org_north",
      source: "simulated",
      status: "online",
      utilityType: "electric",
    });
    persistence.createMeter({
      buildingId: building.id,
      externalId: "offline-meter",
      organizationId: "org_north",
      source: "simulated",
      status: "offline",
      utilityType: "electric",
    });
    for (const conditionType of ["stale_device", "outage_suspected"] as const) {
      persistence.createAlertRule({
        conditionType,
        enabled: true,
        name: conditionType,
        organizationId: "org_north",
        scopeType: "organization",
        windowMinutes: 120,
      });
    }

    const result = evaluator.evaluate({
      now: "2026-06-29T11:00:00.000Z",
      organizationId: "org_north",
    });

    expect(result.createdCount).toBe(2);
    expect(result.events.map((event) => event.title).sort()).toEqual([
      "Device stale",
      "Outage suspected",
    ]);
  });
});

function createFixture() {
  const persistence = new InMemoryPersistenceService();
  return {
    evaluator: new AlertEvaluatorService(persistence),
    persistence,
  };
}

function nextHour(value: string): string {
  const date = new Date(value);
  date.setUTCHours(date.getUTCHours() + 1);
  return date.toISOString();
}
