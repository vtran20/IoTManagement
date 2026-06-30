const metrics = [
  {
    label: "Water Usage",
    value: "128,440 gal",
    previous: "117,900 gal previous month",
    change: "+8.9%",
    trend: "up",
  },
  {
    label: "Electric Usage",
    value: "42,817 kWh",
    previous: "39,120 kWh previous month",
    change: "+9.4%",
    trend: "up",
  },
  {
    label: "Device Health",
    value: "97.2%",
    previous: "214 meters reporting",
    change: "+2.1%",
    trend: "up",
  },
  {
    label: "Open Alerts",
    value: "14",
    previous: "22 previous month",
    change: "-36.4%",
    trend: "down",
  },
];

const sidebarGroups = [
  {
    label: "Operations",
    items: ["Dashboard", "Buildings", "Units", "Meters", "Alerts", "Reports"],
  },
  {
    label: "Management",
    items: ["Organizations", "Members", "Billing", "Settings"],
  },
];

const channelRows = [
  { month: "Jan", water: 44, electric: 24, shared: 12 },
  { month: "Feb", water: 40, electric: 28, shared: 15 },
  { month: "Mar", water: 48, electric: 22, shared: 18 },
  { month: "Apr", water: 41, electric: 30, shared: 16 },
  { month: "May", water: 52, electric: 27, shared: 14 },
  { month: "Jun", water: 56, electric: 25, shared: 19 },
];

export default function HomePage() {
  return (
    <main className="admin-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <div className="brand-mark">IU</div>
          <div>
            <strong>IoT Utilities</strong>
            <span>Smart buildings</span>
          </div>
        </div>

        {sidebarGroups.map((group) => (
          <nav className="nav-group" key={group.label} aria-label={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => (
              <a
                className={
                  item === "Dashboard" ? "nav-item active" : "nav-item"
                }
                href="#"
                key={item}
              >
                <span className="nav-dot" />
                {item}
              </a>
            ))}
          </nav>
        ))}

        <div className="account-block">
          <div className="avatar">NO</div>
          <div>
            <strong>North Owner</strong>
            <span>owner@north.example</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-row">
            <span className="panel-toggle" aria-hidden="true" />
            <h1>Building Utilities Dashboard</h1>
          </div>
          <div className="topbar-actions" aria-label="Dashboard controls">
            <button className="search-button" type="button">
              Search
              <kbd>Cmd K</kbd>
            </button>
            <button className="icon-button" type="button" aria-label="Alerts">
              <span className="alert-badge">2</span>
            </button>
            <button className="mode-button" type="button">
              Default
            </button>
          </div>
        </header>

        <section className="content-grid" aria-label="Utilities dashboard">
          <section className="metric-strip" aria-label="Utility summary">
            {metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <div className="metric-label-row">
                  <span className="metric-icon" />
                  <h2>{metric.label}</h2>
                </div>
                <p className="previous">{metric.previous}</p>
                <strong>{metric.value}</strong>
                <p
                  className={
                    metric.trend === "down" ? "change positive" : "change"
                  }
                >
                  {metric.change} vs last month
                </p>
              </article>
            ))}
          </section>

          <article className="chart-card usage-card">
            <div className="card-heading">
              <div>
                <span className="chart-icon" />
                <h2>Total Utility Usage</h2>
              </div>
              <div className="legend">
                <span className="legend-dark">Water</span>
                <span className="legend-muted">Electric</span>
              </div>
            </div>
            <div className="chart-value">
              <strong>$63,300.00</strong>
              <span>This year estimated cost</span>
            </div>
            <svg
              className="line-chart"
              viewBox="0 0 900 260"
              role="img"
              aria-label="Water and electric usage trend"
            >
              <path
                className="grid-line"
                d="M0 220H900M0 160H900M0 100H900M0 40H900"
              />
              <path
                className="area-fill"
                d="M0 170L80 150L160 165L240 140L320 152L400 128L480 148L560 122L640 135L720 112L800 130L900 100V240H0Z"
              />
              <path
                className="line-muted"
                d="M0 170L80 150L160 165L240 140L320 152L400 128L480 148L560 122L640 135L720 112L800 130L900 100"
              />
              <path
                className="line-dark"
                d="M0 155L80 166L160 120L240 145L320 96L400 155L480 112L560 137L640 88L720 126L800 70L900 58"
              />
            </svg>
            <div className="months">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map(
                (month) => (
                  <span key={month}>{month}</span>
                ),
              )}
            </div>
          </article>

          <article className="chart-card channel-card">
            <div className="card-heading compact">
              <div>
                <span className="chart-icon" />
                <h2>Usage by Scope</h2>
              </div>
            </div>
            <div className="mini-legend">
              <span>Water</span>
              <span>Electric</span>
              <span>Shared</span>
            </div>
            <div className="bar-stack-list">
              {channelRows.map((row) => (
                <div className="bar-row" key={row.month}>
                  <span>{row.month}</span>
                  <div className="stack">
                    <span style={{ width: `${row.water}%` }} />
                    <span style={{ width: `${row.electric}%` }} />
                    <span style={{ width: `${row.shared}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="axis-row">
              <span>$0</span>
              <span>$40K</span>
              <span>$80K</span>
              <span>$120K</span>
            </div>
          </article>

          <article className="small-card">
            <div className="small-heading">
              <span className="metric-icon" />
              <div>
                <p>Average Unit Usage</p>
                <strong>837 kWh</strong>
              </div>
            </div>
            <div className="bar-chart">
              {[28, 64, 8, 52, 38, 72, 59, 44, 81, 55, 76, 41].map(
                (height, index) => (
                  <span key={`${height}-${index}`} style={{ height }} />
                ),
              )}
            </div>
          </article>

          <article className="small-card">
            <div className="small-heading">
              <span className="metric-icon" />
              <div>
                <p>Meter Inventory</p>
                <strong>214 online</strong>
              </div>
            </div>
            <div className="status-list">
              <span>
                <b>Water</b>
                126 meters
              </span>
              <span>
                <b>Electric</b>
                88 meters
              </span>
              <span>
                <b>Stale</b>6 meters
              </span>
            </div>
          </article>

          <article className="small-card">
            <div className="small-heading">
              <span className="metric-icon" />
              <div>
                <p>Alert Categories</p>
                <strong>14 open</strong>
              </div>
            </div>
            <div className="donut-wrap">
              <div className="donut" />
              <ul>
                <li>Leak suspected 43%</li>
                <li>High usage 36%</li>
                <li>Stale device 21%</li>
              </ul>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
