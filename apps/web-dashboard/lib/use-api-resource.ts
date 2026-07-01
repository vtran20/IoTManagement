"use client";

import { useEffect, useState } from "react";
import type { CurrentUserResponse } from "@iot-management/types";
import { apiFetch } from "./auth-client";

export type ResourceState<T> =
  | { data?: undefined; status: "loading" }
  | { data?: undefined; status: "error" }
  | { data: T; status: "ready" };

export function useApiResource<T>(path: string): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: "loading" });

  useEffect(() => {
    let mounted = true;
    setState({ status: "loading" });
    apiFetch(path, { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed: ${path}`);
        }
        const data = (await response.json()) as T;
        if (mounted) {
          setState({ data, status: "ready" });
        }
      })
      .catch(() => {
        if (mounted) {
          setState({ status: "error" });
        }
      });
    return () => {
      mounted = false;
    };
  }, [path]);

  return state;
}

export function useCurrentSession() {
  return useApiResource<CurrentUserResponse>("/auth/me");
}

export function canMutate(role?: string): boolean {
  return role === "owner" || role === "manager";
}

export async function fetchJson<T>(path: string, init: RequestInit = {}) {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return (await response.json()) as T;
}

export async function mutateJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const csrf = await fetchJson<{ csrfToken: string }>("/auth/csrf");
  return fetchJson<T>(path, {
    ...init,
    headers: {
      "x-csrf-token": csrf.csrfToken,
      ...init.headers,
    },
  });
}
