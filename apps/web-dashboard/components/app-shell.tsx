import type { ReactNode } from "react";
import { topbarActionIconFor } from "../lib/iconography";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { Nav } from "./nav";

export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const SearchIcon = topbarActionIconFor("Search");
  const ExportIcon = topbarActionIconFor("Export");

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
        <Nav />
        <AccountMenu />
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div className="title-row">
            <MobileNav />
            <span className="panel-toggle" aria-hidden="true" />
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions" aria-label="Dashboard controls">
            <button className="mode-button" type="button">
              <SearchIcon aria-hidden="true" className="button-icon" />
              <span>Search</span>
            </button>
            <button className="mode-button" type="button">
              <ExportIcon aria-hidden="true" className="button-icon" />
              <span>Export</span>
            </button>
          </div>
        </header>
        <section className="content-grid">{children}</section>
      </section>
    </main>
  );
}
