import React from "react";

export type BreadcrumbItem = { href?: string; label: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li key={`${item.href ?? "current"}:${item.label}`}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {current || !item.href ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <a href={item.href}>{item.label}</a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
