import { AppShell } from "../../components/app-shell";
import { reportRows } from "../../lib/api";

export default function ReportsPage() {
  return (
    <AppShell title="Reports">
      <section className="page-header">
        <h2>Monthly Usage</h2>
        <p>Monthly usage summary</p>
      </section>
      <div className="data-panel">
        <table>
          <thead>
            <tr>
              <th>Report</th>
              <th>Water</th>
              <th>Electric</th>
              <th>Estimated cost</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.waterGallons.toLocaleString()} gal</td>
                <td>{row.electricKwh.toLocaleString()} kWh</td>
                <td>{row.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
