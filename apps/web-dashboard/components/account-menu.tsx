"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrentUserResponse } from "@iot-management/types";
import { apiFetch } from "../lib/auth-client";

export function AccountMenu() {
  const router = useRouter();
  const [session, setSession] = useState<CurrentUserResponse | undefined>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch("/auth/me", { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          router.replace("/login");
          return;
        }
        const body = (await response.json()) as CurrentUserResponse;
        if (active) {
          setSession(body);
        }
      })
      .catch(() => router.replace("/login"));
    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    setIsLoggingOut(true);
    try {
      const csrf = await apiFetch("/auth/csrf", { method: "GET" });
      const { csrfToken } = (await csrf.json()) as { csrfToken: string };
      await apiFetch("/auth/logout", {
        headers: {
          "x-csrf-token": csrfToken,
        },
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const initials = (session?.user.name ?? "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="account-block">
      <div className="avatar">{initials}</div>
      <div>
        <strong>{session?.user.name ?? "Loading account"}</strong>
        <span>{session?.user.email ?? "Checking session"}</span>
      </div>
      <button
        className="logout-button"
        disabled={isLoggingOut}
        onClick={logout}
        type="button"
      >
        <LogOut aria-hidden="true" className="button-icon" />
        <span>{isLoggingOut ? "..." : "Logout"}</span>
      </button>
    </div>
  );
}
