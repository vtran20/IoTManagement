"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DashboardOperationsResponse,
  DashboardOverviewQuery,
  DashboardOverviewResponse,
} from "@iot-management/types";
import { fetchJson } from "./use-api-resource";

export function dashboardOverviewQueryKey(
  filters: DashboardOverviewQuery = {},
) {
  return [...dashboardOverviewQueryRootKey, normalizeFilters(filters)] as const;
}

export const dashboardOverviewQueryRootKey = ["dashboard", "overview"] as const;

export const dashboardOperationsQueryRootKey = [
  "dashboard",
  "operations",
] as const;

export const dashboardOperationsQueryKey = dashboardOperationsQueryRootKey;

export function useDashboardOverview(filters: DashboardOverviewQuery = {}) {
  const normalizedFilters = normalizeFilters(filters);
  return useQuery({
    queryFn: () =>
      fetchJson<DashboardOverviewResponse>(
        `/dashboard/overview${serializeFilters(normalizedFilters)}`,
      ),
    queryKey: dashboardOverviewQueryKey(normalizedFilters),
    refetchInterval: 60_000,
    retry: 1,
    staleTime: 30_000,
  });
}

export function useDashboardOperations() {
  return useQuery({
    queryFn: () =>
      fetchJson<DashboardOperationsResponse>("/dashboard/operations"),
    queryKey: dashboardOperationsQueryKey,
    refetchInterval: 60_000,
    retry: 1,
    staleTime: 30_000,
  });
}

export function useInvalidateDashboardOverview() {
  const queryClient = useQueryClient();
  return () => invalidateDashboardQueries(queryClient);
}

export async function invalidateDashboardQueries(queryClient: {
  invalidateQueries(input: { queryKey: readonly string[] }): Promise<unknown>;
}) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: dashboardOverviewQueryRootKey }),
    queryClient.invalidateQueries({
      queryKey: dashboardOperationsQueryRootKey,
    }),
  ]);
}

function normalizeFilters(
  filters: DashboardOverviewQuery,
): DashboardOverviewQuery {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as DashboardOverviewQuery;
}

function serializeFilters(filters: DashboardOverviewQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
