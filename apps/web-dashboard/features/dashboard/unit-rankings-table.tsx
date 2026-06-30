import { units } from "../../lib/api";

export function UnitRankingsTable() {
  return (
    <article className="small-card table-card">
      <div className="small-heading">
        <span className="metric-icon" />
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
          {units.map((unit, index) => (
            <tr key={unit.id}>
              <td>{unit.name}</td>
              <td>{index === 0 ? "18,420 gal" : "9,820 gal"}</td>
              <td>{index === 0 ? "4,870 kWh" : "2,240 kWh"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
