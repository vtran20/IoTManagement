"use client";

import { useEffect, useState } from "react";
import type { CurrentUserResponse } from "@iot-management/types";
import { apiFetch } from "../../../lib/auth-client";

export function ProfilePanel() {
  const [session, setSession] = useState<CurrentUserResponse | undefined>();

  useEffect(() => {
    let active = true;
    apiFetch("/auth/me")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as CurrentUserResponse;
        if (active) {
          setSession(body);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="data-panel profile-panel">
      <div>
        <span>Name</span>
        <strong>{session?.user.name ?? "Loading"}</strong>
      </div>
      <div>
        <span>Email</span>
        <strong>{session?.user.email ?? "Loading"}</strong>
      </div>
      <div>
        <span>Role</span>
        <strong>{session?.membership.role ?? "Loading"}</strong>
      </div>
      <div>
        <span>Organization</span>
        <strong>{session?.organization.name ?? "Loading"}</strong>
      </div>
    </section>
  );
}
