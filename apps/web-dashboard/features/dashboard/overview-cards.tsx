import { overview } from "../../lib/api";

export function OverviewCards() {
  const cards = [
    ["Water Usage", overview.waterUsage, "Current month"],
    ["Electric Usage", overview.electricUsage, "Current month"],
    ["Device Health", overview.health, "Reporting status"],
    ["Open Alerts", String(overview.alertCount), "Needs review"],
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
