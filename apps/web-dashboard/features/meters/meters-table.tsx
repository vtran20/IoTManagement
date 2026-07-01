import { buildingName, meters, unitName } from "../../lib/api";

export function MetersTable() {
  return (
    <div className="data-panel">
      <table>
        <thead>
          <tr>
            <th>Meter</th>
            <th>External ID</th>
            <th>Utility</th>
            <th>Status</th>
            <th>Assignment</th>
          </tr>
        </thead>
        <tbody>
          {meters.map((meter) => (
            <tr key={meter.id}>
              <td>
                <a href={`/meters/${meter.id}`}>{meter.label}</a>
              </td>
              <td>{meter.externalId}</td>
              <td>{meter.utilityType}</td>
              <td>
                <span className={`status-pill ${meter.status}`}>
                  {meter.status}
                </span>
              </td>
              <td>
                {buildingName(meter.buildingId)} / {unitName(meter.unitId)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
