"use client";

import type { MonthlyUsageReportResponse } from "@iot-management/types";
import { apiBaseUrl } from "../../lib/auth-client";
import { useApiResource } from "../../lib/use-api-resource";
import { MonthlyUsageReport } from "./monthly-usage-report";

export function ReportsPanel({ state }: { state?: string }) {
  const report = useApiResource<MonthlyUsageReportResponse>(
    "/reports/monthly-usage?month=2026-06",
  );

  if (state === "empty") {
    return <NoReportData />;
  }

  if (state === "loading" || report.status === "loading") {
    return <section className="state-panel">Loading reports</section>;
  }

  if (state === "error" || report.status === "error") {
    return (
      <section className="state-panel error-state">
        Report data is unavailable
      </section>
    );
  }

  if (report.data.rows.length === 0) {
    return <NoReportData />;
  }

  return (
    <>
      <section className="data-panel report-actions">
        <a
          className="mode-button"
          href={`${apiBaseUrl}/reports/monthly-usage/export?month=2026-06`}
        >
          Download CSV
        </a>
      </section>
      <MonthlyUsageReport report={report.data} />
    </>
  );
}

function NoReportData() {
  return (
    <section className="state-panel">
      <h2>No report data yet</h2>
      <p>Seed demo data or run monthly aggregation to generate reports.</p>
    </section>
  );
}
