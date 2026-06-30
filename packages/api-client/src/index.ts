import type { HealthResponse } from "@iot-management/types";

export interface ApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export function createApiClient({
  baseUrl,
  fetcher = fetch,
}: ApiClientOptions) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    async health(): Promise<HealthResponse> {
      const response = await fetcher(`${normalizedBaseUrl}/api/v1/health`);
      if (!response.ok) {
        throw new Error(`Health request failed with status ${response.status}`);
      }
      return response.json() as Promise<HealthResponse>;
    },
  };
}
