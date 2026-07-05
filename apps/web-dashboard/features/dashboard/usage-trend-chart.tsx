import type {
  DashboardOverviewRange,
  DashboardSummaryResponse,
  UsageTrendPoint,
} from "@iot-management/types";
import { dashboardPanelIconFor } from "../../lib/iconography";
import { formatDashboardRangeLabel } from "./dashboard-period";

export function UsageTrendChart({
  range,
  summary,
  trends,
}: {
  range: DashboardOverviewRange;
  summary: DashboardSummaryResponse;
  trends: UsageTrendPoint[];
}) {
  const totalCost = summary.utilitySummaries.reduce(
    (sum, item) => sum + (item.costEstimate ?? 0),
    0,
  );
  const points = trends.slice(0, 6);
  const axisPeriods = trendAxisPeriods(points.length ? points : trends).slice(
    0,
    6,
  );
  const ChartIcon = dashboardPanelIconFor("Total Utility Usage");
  return (
    <article className="chart-card usage-card">
      <div className="card-heading">
        <div>
          <span className="chart-icon">
            <ChartIcon aria-hidden="true" />
          </span>
          <h2>Total Utility Usage</h2>
        </div>
        <div className="legend">
          <span className="legend-dark">Water</span>
          <span className="legend-muted">Electric</span>
        </div>
      </div>
      <div className="chart-value">
        <strong>{formatMoney(totalCost)}</strong>
        <span>
          Estimated cost, {formatDashboardRangeLabel(range).toLowerCase()}
        </span>
      </div>
      <svg
        className="line-chart"
        viewBox="0 0 900 260"
        role="img"
        aria-label="Water and electric usage trend"
      >
        <path
          className="grid-line"
          d="M0 220H900M0 160H900M0 100H900M0 40H900"
        />
        <path
          className="area-fill"
          d="M0 170L90 150L180 165L270 138L360 152L450 128L540 148L630 122L720 112L810 130L900 100V240H0Z"
        />
        <path
          className="line-muted"
          d="M0 170L90 150L180 165L270 138L360 152L450 128L540 148L630 122L720 112L810 130L900 100"
        />
        <path
          className="line-dark"
          d="M0 155L90 166L180 120L270 145L360 96L450 155L540 112L630 137L720 88L810 70L900 58"
        />
      </svg>
      <div className="months">
        {axisPeriods.map((periodStart) => (
          <span key={periodStart}>
            {new Intl.DateTimeFormat("en-US", {
              month: "short",
              timeZone: "UTC",
            }).format(new Date(periodStart))}
          </span>
        ))}
      </div>
    </article>
  );
}

export function trendAxisPeriods(trends: UsageTrendPoint[]): string[] {
  return [...new Set(trends.map((point) => point.periodStart))];
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}
