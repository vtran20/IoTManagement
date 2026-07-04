export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  (process.env.NODE_ENV === "development"
    ? typeof window === "undefined"
      ? "/api/v1"
      : `http://${window.location.hostname}:3001/api/v1`
    : "/api/v1");

export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}
