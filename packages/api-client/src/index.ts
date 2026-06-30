import type { ApiClientOptions } from "./client";
import { createApiClient as createVersionedClient } from "./client";
import { createEndpoints } from "./endpoints";

export * from "./client";
export * from "./endpoints";

export function createApiClient(options: ApiClientOptions) {
  const client = createVersionedClient(options);

  return {
    ...client,
    ...createEndpoints(client),
  };
}
