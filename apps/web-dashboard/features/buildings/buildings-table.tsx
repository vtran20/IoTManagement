import { buildings, meters } from "../../lib/api";

export function BuildingsTable() {
  return (
    <div className="data-panel">
      <table>
        <thead>
          <tr>
            <th>Building</th>
            <th>Address</th>
            <th>Meters</th>
            <th>Timezone</th>
          </tr>
        </thead>
        <tbody>
          {buildings.map((building) => (
            <tr key={building.id}>
              <td>
                <a href={`/buildings/${building.id}`}>{building.name}</a>
              </td>
              <td>{building.address}</td>
              <td>
                {
                  meters.filter((meter) => meter.buildingId === building.id)
                    .length
                }
              </td>
              <td>{building.timezone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
