const navItems = [
  ["Dashboard", "/dashboard"],
  ["Buildings", "/buildings"],
  ["Units", "/units"],
  ["Meters", "/meters"],
  ["Alerts", "/alerts"],
  ["Reports", "/reports"],
  ["Settings", "/settings"],
] as const;

export function Nav() {
  return (
    <nav className="nav-group" aria-label="Operations">
      <p>Operations</p>
      {navItems.map(([label, href]) => (
        <a className="nav-item" href={href} key={href}>
          <span className="nav-dot" />
          {label}
        </a>
      ))}
    </nav>
  );
}
