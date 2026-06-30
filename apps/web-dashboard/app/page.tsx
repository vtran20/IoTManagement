const summaryItems = [
  { label: "Water Usage", value: "Ready for simulated readings" },
  { label: "Electric Usage", value: "Ready for simulated readings" },
  { label: "Device Health", value: "PostgreSQL and Redis local runtime" },
];

export default function HomePage() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-header" aria-labelledby="dashboard-title">
        <p className="eyebrow">Smart Utilities SaaS</p>
        <h1 id="dashboard-title">Building Utilities Dashboard</h1>
        <p>
          Operational workspace for monitoring water, electric usage, alerts,
          and meter health across buildings and units.
        </p>
      </section>

      <section
        className="summary-grid"
        aria-label="Dashboard readiness summary"
      >
        {summaryItems.map((item) => (
          <article className="summary-card" key={item.label}>
            <h2>{item.label}</h2>
            <p>{item.value}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
