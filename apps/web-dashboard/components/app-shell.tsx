import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { Nav } from "./nav";

export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
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
            <span className="panel-toggle" aria-hidden="true" />
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions" aria-label="Dashboard controls">
            <button className="mode-button" type="button">
              Search
            </button>
            <button className="mode-button" type="button">
              Export
            </button>
          </div>
        </header>
        <section className="content-grid">{children}</section>
      </section>
    </main>
  );
}
