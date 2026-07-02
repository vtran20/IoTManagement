"use client";

import { PanelLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Nav } from "./nav";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const ToggleIcon = isOpen ? X : PanelLeft;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <div className="mobile-nav">
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        className="mobile-nav-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <ToggleIcon aria-hidden="true" className="button-icon" />
        <span>Menu</span>
      </button>
      <button
        aria-label="Close navigation"
        className="mobile-nav-backdrop"
        hidden={!isOpen}
        onClick={() => setIsOpen(false)}
        type="button"
      />
      <div className="mobile-nav-panel" hidden={!isOpen}>
        <div className="brand-block">
          <div className="brand-mark">IU</div>
          <div>
            <strong>IoT Utilities</strong>
            <span>Smart buildings</span>
          </div>
        </div>
        <Nav ariaLabel="Mobile navigation" />
        <div className="mobile-account-block">
          <div className="avatar">NU</div>
          <div>
            <strong>North Utilities</strong>
            <span>owner@north.example</span>
          </div>
          <X aria-hidden="true" className="button-icon" />
        </div>
      </div>
    </div>
  );
}
