"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/auth-client";
import { useCurrentSession } from "../lib/use-api-resource";

export function AccountMenu() {
  const router = useRouter();
  const session = useCurrentSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (session.status === "error") {
      router.replace("/login");
    }
  }, [router, session.status]);

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

  const initials = (session.data?.user.name ?? "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="account-block">
      <div className="avatar">{initials}</div>
      <div>
        <strong>{session.data?.user.name ?? "Loading account"}</strong>
        <span>{session.data?.user.email ?? "Checking session"}</span>
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
