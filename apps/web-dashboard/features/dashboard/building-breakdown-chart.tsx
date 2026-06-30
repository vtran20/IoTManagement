export function BuildingBreakdownChart() {
  const rows = [
    ["North Ridge", 58, 31],
    ["Lakeview", 42, 22],
    ["Shared", 28, 16],
  ] as const;
  return (
    <article className="chart-card channel-card">
      <div className="card-heading compact">
        <div>
          <span className="chart-icon" />
          <h2>Usage by Building</h2>
        </div>
      </div>
      <div className="mini-legend">
        <span>Water</span>
        <span>Electric</span>
      </div>
      <div className="bar-stack-list">
        {rows.map(([name, water, electric]) => (
          <div className="bar-row" key={name}>
            <span>{name}</span>
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
