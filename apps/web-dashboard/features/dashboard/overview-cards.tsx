import type {
  DashboardOverviewRange,
  DashboardSummaryResponse,
  UtilitySummary,
  UtilityType,
} from "@iot-management/types";
import { dashboardMetricIconFor } from "../../lib/iconography";
import { formatDashboardRangeLabel } from "./dashboard-period";

export function OverviewCards({
  range,
  summary,
}: {
  range: DashboardOverviewRange;
  summary: DashboardSummaryResponse;
}) {
  return (
    <section className="usage-summary-strip" aria-label="Utility usage summary">
      {usageSummaryCards(summary, range).map((card) => {
        const Icon = dashboardMetricIconFor(card.label);
        return (
          <article className="metric-card" key={card.label}>
            <div className="metric-label-row">
              <span className="metric-icon">
                <Icon aria-hidden="true" />
              </span>
              <h2>{card.label}</h2>
            </div>
            <p className={card.comparison ? "change" : "previous"}>
              {card.support}
            </p>
            <strong>{card.value}</strong>
            {card.cost ? <p className="previous">{card.cost}</p> : null}
          </article>
        );
      })}
    </section>
  );
}

export function usageSummaryCards(
  summary: DashboardSummaryResponse,
  range: DashboardOverviewRange,
) {
  return [
    usageCard(findUtility(summary, "water"), "Water Usage", "gal", range),
    usageCard(findUtility(summary, "electric"), "Electric Usage", "kWh", range),
  ];
}

function usageCard(
  utility: UtilitySummary | undefined,
  label: "Electric Usage" | "Water Usage",
  unit: string,
  range: DashboardOverviewRange,
) {
  const comparison = utility?.comparisonPercent;
  return {
    comparison: Number.isFinite(comparison),
    cost:
      utility?.costEstimate === undefined
        ? undefined
        : `Estimated cost ${formatMoney(utility.costEstimate)}`,
    label,
    support: Number.isFinite(comparison)
      ? formatComparison(comparison!)
      : formatDashboardRangeLabel(range),
    value: `${formatNumber(utility?.usageValue ?? 0)} ${unit}`,
  };
}

function findUtility(
  summary: DashboardSummaryResponse,
  utilityType: UtilityType,
) {
  return summary.utilitySummaries.find(
    (item) => item.utilityType === utilityType,
  );
}

function formatComparison(comparison: number): string {
  const prefix = comparison > 0 ? "+" : "";
  return `${prefix}${comparison.toFixed(1)}% vs previous period`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
