import type {
  IngestReadingRequest,
  ReadingUnit,
  SimulationScenario,
  UtilityType,
} from "@iot-management/types";
import { createSimulationTimeline } from "./simulation-clock";

export interface GenerateSimulatedReadingsInput {
  intervalMinutes: number;
  intervals: number;
  meterExternalId: string;
  offlineMeterExternalIds?: string[];
  scenario?: SimulationScenario;
  seed: string;
  startAt: string;
  utilityType: UtilityType;
}

export function generateSimulatedReadings(
  input: GenerateSimulatedReadingsInput,
): IngestReadingRequest[] {
  if (
    input.scenario === "offline" &&
    input.offlineMeterExternalIds?.includes(input.meterExternalId)
  ) {
    return [];
  }

  const random = seededRandom(
    `${input.seed}:${input.meterExternalId}:${input.utilityType}`,
  );
  const spikeIndex = Math.max(0, Math.floor(input.intervals / 2));

  return createSimulationTimeline(input).map((measuredAt, index) => {
    const timestamp = new Date(measuredAt);
    const value = roundReadingValue(
      scenarioValue({
        hour: timestamp.getUTCHours(),
        index,
        random: random(),
        scenario: input.scenario ?? "normal",
        spikeIndex,
        utilityType: input.utilityType,
      }),
    );

    return {
      measuredAt,
      meterExternalId: input.meterExternalId,
      readingKind: "interval",
      unit: readingUnitForUtility(input.utilityType),
      utilityType: input.utilityType,
      value,
    };
  });
}

function scenarioValue(input: {
  hour: number;
  index: number;
  random: number;
  scenario: SimulationScenario;
  spikeIndex: number;
  utilityType: UtilityType;
}): number {
  const base =
    input.utilityType === "water"
      ? waterUsage(input.hour, input.random)
      : electricUsage(input.hour, input.random);

  if (input.scenario === "leak" && input.utilityType === "water") {
    return Math.max(base, 0.75 + input.random * 0.8);
  }

  if (input.scenario === "spike" && input.index === input.spikeIndex) {
    return base * 6.5;
  }

  return base;
}

function waterUsage(hour: number, random: number): number {
  if (hour >= 5 && hour <= 8) {
    return 4.5 + random * 5;
  }
  if (hour >= 17 && hour <= 21) {
    return 3.5 + random * 4.5;
  }
  if (hour >= 0 && hour <= 4) {
    return random * 0.2;
  }
  return 0.6 + random * 2.2;
}

function electricUsage(hour: number, random: number): number {
  if (hour >= 17 && hour <= 22) {
    return 5.5 + random * 3.2;
  }
  if (hour >= 8 && hour <= 16) {
    return 3.2 + random * 2.1;
  }
  return 1.1 + random * 1.4;
}

function readingUnitForUtility(utilityType: UtilityType): ReadingUnit {
  return utilityType === "water" ? "gallon" : "kwh";
}

function roundReadingValue(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function seededRandom(seed: string): () => number {
  let state = stringHash(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function stringHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
