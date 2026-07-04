"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { navigationIconFor } from "../lib/iconography";

export const navItems = [
  ["Dashboard", "/dashboard"],
  ["Incidents", "/incidents"],
  ["Work Orders", "/work-orders"],
  ["Buildings", "/buildings"],
  ["Units", "/units"],
  ["Meters", "/meters"],
  ["Alerts", "/alerts"],
  ["Reports", "/reports"],
  ["Settings", "/settings"],
] as const;

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ ariaLabel = "Operations" }: { ariaLabel?: string }) {
  const pathname = usePathname();

  return (
    <nav className="nav-group" aria-label={ariaLabel}>
      <p>Operations</p>
      {navItems.map(([label, href]) => {
        const active = isNavigationItemActive(pathname, href);

        return (
          <a
            aria-current={active ? "page" : undefined}
            className={`nav-item${active ? " active" : ""}`}
            href={href}
            key={href}
          >
            {(() => {
              const Icon = navigationIconFor(label);
              return <Icon aria-hidden="true" className="nav-icon" />;
            })()}
            <span>{label}</span>
            <ChevronRight aria-hidden="true" className="nav-chevron" />
          </a>
        );
      })}
    </nav>
  );
}
