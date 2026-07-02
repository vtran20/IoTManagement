import type { BuildingBreakdownItem } from "@iot-management/types";
import { dashboardPanelIconFor } from "../../lib/iconography";

export function BuildingBreakdownChart({
  rows,
}: {
  rows: BuildingBreakdownItem[];
}) {
  const grouped = groupByBuilding(rows);
  const ChartIcon = dashboardPanelIconFor("Usage by Building");
  return (
    <article className="chart-card channel-card">
      <div className="card-heading compact">
        <div>
          <span className="chart-icon">
            <ChartIcon aria-hidden="true" />
          </span>
          <h2>Usage by Building</h2>
        </div>
      </div>
      <div className="mini-legend">
        <span>Water</span>
        <span>Electric</span>
      </div>
      <div className="bar-stack-list">
        {grouped.map(({ electric, name, water }) => (
          <div className="bar-row" key={name}>
            <span title={name}>{name}</span>
            <div className="stack">
              <span style={{ width: `${water}%` }} />
              <span style={{ width: `${electric}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function groupByBuilding(rows: BuildingBreakdownItem[]) {
  const max = Math.max(...rows.map((row) => row.usageValue), 1);
  const grouped = new Map<
    string,
    { electric: number; name: string; water: number }
  >();
  for (const row of rows) {
    const existing = grouped.get(row.buildingId) ?? {
      electric: 0,
      name: row.buildingName,
      water: 0,
    };
    if (row.utilityType === "water") {
      existing.water = Math.max(existing.water, (row.usageValue / max) * 100);
    } else {
      existing.electric = Math.max(
        existing.electric,
        (row.usageValue / max) * 100,
      );
    }
    grouped.set(row.buildingId, existing);
  }
  return [...grouped.values()];
}
