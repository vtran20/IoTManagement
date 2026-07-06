import { describe, expect, it } from "vitest";
import { ApiError } from "../common/errors/api-error";
import { InMemoryPersistenceService } from "../persistence/in-memory-persistence.service";
import { ReadingValidationService } from "./reading-validation.service";

describe("ReadingValidationService", () => {
  const service = new ReadingValidationService(
    new InMemoryPersistenceService(),
  );

  it("rejects units that do not match the meter utility type", async () => {
    await expect(
      service.validate({
        meter: {
          id: "meter_1",
          organizationId: "org_north",
          buildingId: "building_1",
          utilityType: "water",
          source: "simulated",
          externalId: "water_1",
          status: "online",
        },
        meterExternalId: "water_1",
        measuredAt: "2026-06-29T12:00:00.000Z",
        readingKind: "interval",
        unit: "kwh",
        utilityType: "water",
        value: 1,
      }),
    ).rejects.toThrow(ApiError);
  });

  it.each([
    ["negative values", { value: -1 }, "INVALID_READING_VALUE"],
    [
      "an invalid timestamp",
      { measuredAt: "not-a-timestamp" },
      "INVALID_READING_TIMESTAMP",
    ],
    [
      "a stale timestamp",
      { measuredAt: "2025-12-31T23:59:59.000Z" },
      "STALE_READING_TIMESTAMP",
    ],
  ])("rejects %s", async (_description, changes, code) => {
    await expect(
      service.validate({
        meter: {
          id: "meter_1",
          organizationId: "org_north",
          buildingId: "building_1",
          utilityType: "water",
          source: "simulated",
          externalId: "water_1",
          status: "online",
        },
        meterExternalId: "water_1",
        measuredAt: "2026-06-29T12:00:00.000Z",
        readingKind: "interval",
        unit: "gallon",
        utilityType: "water",
        value: 1,
        ...changes,
      }),
    ).rejects.toMatchObject({ code });
  });
});
