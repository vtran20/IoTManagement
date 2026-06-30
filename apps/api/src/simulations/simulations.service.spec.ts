import type { IngestReadingResponse, Meter } from "@iot-management/types";
import { describe, expect, it, vi } from "vitest";
import type { RequestContext } from "../common/request-context";
import type { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import type { ReadingsService } from "../readings/readings.service";
import { generateSimulatedReadings } from "./simulated-usage-profile";
import { SimulationsService } from "./simulations.service";

describe("generateSimulatedReadings", () => {
  const startAt = "2026-06-29T00:00:00.000Z";

  it("produces the same water reading series for the same seed", () => {
    const first = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 6,
      meterExternalId: "water-main",
      seed: "demo-seed",
      startAt,
      utilityType: "water",
    });
    const second = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 6,
      meterExternalId: "water-main",
      seed: "demo-seed",
      startAt,
      utilityType: "water",
    });

    expect(second).toEqual(first);
  });

  it("produces different water reading values for different seeds", () => {
    const first = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 6,
      meterExternalId: "water-main",
      seed: "demo-seed-a",
      startAt,
      utilityType: "water",
    });
    const second = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 6,
      meterExternalId: "water-main",
      seed: "demo-seed-b",
      startAt,
      utilityType: "water",
    });

    expect(second.map((reading) => reading.value)).not.toEqual(
      first.map((reading) => reading.value),
    );
  });

  it("produces the same electric reading series for the same seed", () => {
    const first = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 6,
      meterExternalId: "electric-main",
      seed: "electric-seed",
      startAt,
      utilityType: "electric",
    });
    const second = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 6,
      meterExternalId: "electric-main",
      seed: "electric-seed",
      startAt,
      utilityType: "electric",
    });

    expect(second).toEqual(first);
  });

  it("creates a short high-usage spike", () => {
    const readings = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 8,
      meterExternalId: "electric-spike",
      scenario: "spike",
      seed: "spike-seed",
      startAt,
      utilityType: "electric",
    });
    const values = readings.map((reading) => reading.value);
    const max = Math.max(...values);
    const withoutMax = values.filter((value) => value !== max);
    const averageWithoutMax =
      withoutMax.reduce((sum, value) => sum + value, 0) / withoutMax.length;

    expect(max).toBeGreaterThan(averageWithoutMax * 3);
    expect(
      values.filter((value) => value > averageWithoutMax * 3),
    ).toHaveLength(1);
  });

  it("creates continuous idle-hour water usage for leak scenario", () => {
    const readings = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 5,
      meterExternalId: "water-leak",
      scenario: "leak",
      seed: "leak-seed",
      startAt,
      utilityType: "water",
    });

    expect(readings.every((reading) => reading.value >= 0.75)).toBe(true);
  });

  it("skips selected offline meters", () => {
    const readings = generateSimulatedReadings({
      intervalMinutes: 60,
      intervals: 5,
      meterExternalId: "water-offline",
      offlineMeterExternalIds: ["water-offline"],
      scenario: "offline",
      seed: "offline-seed",
      startAt,
      utilityType: "water",
    });

    expect(readings).toEqual([]);
  });
});

describe("SimulationsService", () => {
  it("runs generated readings through ingestion and reports duplicates", () => {
    const context = {
      organization: { id: "org_north" },
    } as RequestContext;
    const meter: Meter = {
      buildingId: "building_1",
      externalId: "water-main",
      id: "meter_1",
      organizationId: "org_north",
      source: "simulated",
      status: "online",
      utilityType: "water",
    };
    const persistence = {
      findMeterByExternalId: vi.fn(() => meter),
      listMeters: vi.fn(() => [meter]),
    } as unknown as InMemoryPersistenceService;
    let ingestCall = 0;
    const readings = {
      ingest: vi.fn((_context, dto) => {
        ingestCall += 1;
        const duplicate = ingestCall === 2;
        return {
          accepted: !duplicate,
          duplicate,
          reading: {
            id: `reading_${dto.measuredAt}`,
            meterId: meter.id,
            organizationId: "org_north",
            quality: "good",
            receivedAt: dto.measuredAt,
            ...dto,
          },
        };
      }) as unknown as IngestReadingResponse,
    } as unknown as ReadingsService;
    const service = new SimulationsService(persistence, readings);

    const result = service.run(context, {
      intervalMinutes: 60,
      intervals: 2,
      meterExternalIds: ["water-main"],
      seed: "service-seed",
      startAt: "2026-06-29T00:00:00.000Z",
    });

    expect(readings.ingest).toHaveBeenCalledTimes(2);
    expect(result.acceptedCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.generatedCount).toBe(2);
  });
});
