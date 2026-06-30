export interface SimulationClockInput {
  intervalMinutes: number;
  intervals: number;
  startAt: string;
}

export function createSimulationTimeline(
  input: SimulationClockInput,
): string[] {
  const start = new Date(input.startAt);
  const intervalMs = input.intervalMinutes * 60 * 1000;

  return Array.from({ length: input.intervals }, (_value, index) =>
    new Date(start.getTime() + index * intervalMs).toISOString(),
  );
}
