import type { MonthlyUsageReportResponse } from "@iot-management/types";
import {
  dashboardMetricIconFor,
  dashboardPanelIconFor,
} from "../../lib/iconography";

export function MonthlyUsageReport({
  report,
}: {
  report: MonthlyUsageReportResponse;
}) {
  const WaterIcon = dashboardMetricIconFor("Water Usage");
  const ElectricIcon = dashboardMetricIconFor("Electric Usage");
  const CostIcon = dashboardPanelIconFor("Estimated Cost");
  const RowsIcon = dashboardPanelIconFor("Report Rows");
  const reportMonth = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(report.periodStart));

  return (
    <>
      <section className="page-header">
        <h2>Monthly Usage Report</h2>
        <p>
          {reportMonth} utility usage grouped by building and unit, ready for
          export.
        </p>
      </section>

      <section
        className="metric-strip report-summary"
        aria-label="Report totals"
      >
        <article className="metric-card">
          <div className="metric-label-row">
            <span className="metric-icon">
              <WaterIcon aria-hidden="true" />
            </span>
            <h2>Water Usage</h2>
          </div>
          <p className="previous">{reportMonth}</p>
          <strong>{formatInteger(report.totals.waterGallons)} gal</strong>
        </article>
        <article className="metric-card">
          <div className="metric-label-row">
            <span className="metric-icon">
              <ElectricIcon aria-hidden="true" />
            </span>
            <h2>Electric Usage</h2>
          </div>
          <p className="previous">{reportMonth}</p>
          <strong>{formatInteger(report.totals.electricKwh)} kWh</strong>
        </article>
        <article className="metric-card">
          <div className="metric-label-row">
            <span className="metric-icon">
              <CostIcon aria-hidden="true" />
            </span>
            <h2>Estimated Cost</h2>
          </div>
          <p className="previous">Water and electric</p>
          <strong>{formatMoney(report.totals.estimatedCost)}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-label-row">
            <span className="metric-icon">
              <RowsIcon aria-hidden="true" />
            </span>
            <h2>Report Rows</h2>
          </div>
          <p className="previous">Export format: {report.format}</p>
          <strong>{report.rows.length}</strong>
        </article>
      </section>

      <div className="data-panel">
        <table>
          <thead>
            <tr>
              {report.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={`${row.buildingId}:${row.unitId ?? "shared"}`}>
                <td>{row.buildingName}</td>
                <td>{row.unitName}</td>
                <td>{formatInteger(row.waterGallons)}</td>
                <td>{formatInteger(row.electricKwh)}</td>
                <td>{formatMoney(row.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}
