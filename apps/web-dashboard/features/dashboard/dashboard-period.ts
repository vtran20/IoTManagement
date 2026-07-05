import type { DashboardOverviewRange } from "@iot-management/types";

export function formatDashboardRangeLabel(
  range: DashboardOverviewRange,
): string {
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  const days = Math.round((to - from) / (24 * 60 * 60 * 1000));

  if (!Number.isFinite(days) || days <= 0) {
    return "Selected period";
  }
  return days === 1 ? "Last day" : `Last ${days} days`;
}
