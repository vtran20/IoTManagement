import type { LeakResponseReportResponse } from "@iot-management/types";

export function LeakResponseReport({
  report,
}: {
  report: LeakResponseReportResponse;
}) {
  return (
    <section
      aria-labelledby="leak-response-report-heading"
      className="leak-response-report"
    >
      <div className="page-header">
        <h2 id="leak-response-report-heading">Leak Response Report</h2>
        <p>
          Response performance, recurring locations, excess-water impact, and
          resolution outcomes for the selected period.
        </p>
      </div>

      <section
        className="metric-strip report-summary"
        aria-label="Leak response totals"
      >
        <article className="metric-card">
          <h2>Incidents</h2>
          <strong>{report.incidentCount}</strong>
        </article>
        <article className="metric-card">
          <h2>Acknowledgement</h2>
          <strong>
            {formatMinutes(report.responseTime.acknowledged.medianMinutes)}
          </strong>
        </article>
        <article className="metric-card">
          <h2>Resolution</h2>
          <strong>
            {formatMinutes(report.responseTime.resolved.medianMinutes)}
          </strong>
        </article>
        <article className="metric-card">
          <h2>Excess Water</h2>
          <strong>{formatNumber(report.excessWater.gallons)} gal</strong>
          <p className="previous">
            {formatMoney(report.excessWater.estimatedCost)}
          </p>
        </article>
      </section>

      <div className="report-grid">
        <section className="data-panel">
          <h2>Recurring Locations</h2>
          {report.recurringLocations.length ? (
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Incidents</th>
                  <th>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {report.recurringLocations.map((location) => (
                  <tr
                    key={`${location.buildingId}:${location.unitId ?? "shared"}`}
                  >
                    <td>
                      {location.buildingName}
                      {location.unitName ? ` / ${location.unitName}` : ""}
                    </td>
                    <td>{location.incidentCount}</td>
                    <td>{location.resolvedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="previous">
              No leak incidents in this reporting period.
            </p>
          )}
        </section>

        <section className="data-panel">
          <h2>Resolution Outcomes</h2>
          <table>
            <thead>
              <tr>
                <th>Outcome</th>
                <th>Incidents</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.resolutionOutcomes).map(
                ([outcome, count]) => (
                  <tr key={outcome}>
                    <td>{outcome.replaceAll("_", " ")}</td>
                    <td>{count}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}

function formatMinutes(value?: number): string {
  return value === undefined ? "No data" : `${formatNumber(value)} min`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}
