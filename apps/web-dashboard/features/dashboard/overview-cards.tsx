import type {
  DashboardSummaryResponse,
  DeviceHealthResponse,
  UtilityType,
} from "@iot-management/types";

export function OverviewCards({
  deviceHealth,
  summary,
}: {
  deviceHealth?: DeviceHealthResponse;
  summary: DashboardSummaryResponse;
}) {
  const water = findUtility(summary, "water");
  const electric = findUtility(summary, "electric");
  const health = `${summary.offlineMeterCount} offline / ${summary.staleMeterCount} stale`;
  const healthPrevious = deviceHealth
    ? `${deviceHealth.meters.length} meters reporting`
    : "Reporting status";
  const cards = [
    [
      "Water Usage",
      `${formatNumber(water?.usageValue ?? 0)} gal`,
      "Current period",
    ],
    [
      "Electric Usage",
      `${formatNumber(electric?.usageValue ?? 0)} kWh`,
      "Current period",
    ],
    ["Device Health", health, healthPrevious],
    ["Open Alerts", String(summary.openAlertCount), "Needs review"],
  ] as const;

  return (
    <section className="metric-strip" aria-label="Utility summary">
      {cards.map(([label, value, previous]) => (
        <article className="metric-card" key={label}>
          <div className="metric-label-row">
            <span className="metric-icon" />
            <h2>{label}</h2>
          </div>
          <p className="previous">{previous}</p>
          <strong>{value}</strong>
          <p className="change">+8.4% vs last month</p>
        </article>
      ))}
    </section>
  );
}

function findUtility(
  summary: DashboardSummaryResponse,
  utilityType: UtilityType,
) {
  return summary.utilitySummaries.find(
    (item) => item.utilityType === utilityType,
  );
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
