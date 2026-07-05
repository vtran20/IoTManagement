import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { Nav } from "./nav";

export function AppShell({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
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
            <MobileNav />
            <span className="panel-toggle" aria-hidden="true" />
            <h1>{title}</h1>
          </div>
          {actions ? (
            <div className="topbar-actions" aria-label="Page controls">
              {actions}
            </div>
          ) : null}
        </header>
        <section className="content-grid">{children}</section>
      </section>
    </main>
  );
}
