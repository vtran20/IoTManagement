import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "../components/breadcrumbs";

describe("Breadcrumbs", () => {
  it("links ancestors and identifies the current page", () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs
        items={[
          { href: "/buildings", label: "Buildings" },
          { href: "/buildings/building_north", label: "North Ridge" },
          { label: "Unit 1201" },
        ]}
      />,
    );

    expect(html).toContain('href="/buildings"');
    expect(html).toContain('href="/buildings/building_north"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Unit 1201");
  });
});
