import type { UnitRankingItem } from "@iot-management/types";
import { dashboardPanelIconFor } from "../../lib/iconography";

export function UnitRankingsTable({ rows }: { rows: UnitRankingItem[] }) {
  const TableIcon = dashboardPanelIconFor("Top Units");
  return (
    <article className="small-card table-card">
      <div className="small-heading">
        <span className="metric-icon">
          <TableIcon aria-hidden="true" />
        </span>
        <div>
          <p>Top Units</p>
          <strong>By usage</strong>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Water</th>
            <th>Electric</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row) => (
            <tr key={`${row.unitId}:${row.utilityType}`}>
              <td>{row.unitName}</td>
              <td>
                {row.utilityType === "water"
                  ? formatUsage(row.usageValue)
                  : "-"}
              </td>
              <td>
                {row.utilityType === "electric"
                  ? formatUsage(row.usageValue)
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function formatUsage(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
