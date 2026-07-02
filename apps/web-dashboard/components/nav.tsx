import { ChevronRight } from "lucide-react";
import { navigationIconFor } from "../lib/iconography";

export const navItems = [
  ["Dashboard", "/dashboard"],
  ["Buildings", "/buildings"],
  ["Units", "/units"],
  ["Meters", "/meters"],
  ["Alerts", "/alerts"],
  ["Reports", "/reports"],
  ["Settings", "/settings"],
] as const;

export function Nav({ ariaLabel = "Operations" }: { ariaLabel?: string }) {
  return (
    <nav className="nav-group" aria-label={ariaLabel}>
      <p>Operations</p>
      {navItems.map(([label, href]) => (
        <a className="nav-item" href={href} key={href}>
          {(() => {
            const Icon = navigationIconFor(label);
            return <Icon aria-hidden="true" className="nav-icon" />;
          })()}
          <span>{label}</span>
          <ChevronRight aria-hidden="true" className="nav-chevron" />
        </a>
      ))}
    </nav>
  );
}
