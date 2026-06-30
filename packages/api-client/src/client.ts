export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = object;

export interface ApiClientOptions {
  baseUrl: string;
  authToken?: string;
  fetcher?: typeof fetch;
}

export interface ApiRequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  query?: QueryParams;
}

export interface ApiClient {
  get<TResponse>(path: string, options?: ApiRequestOptions): Promise<TResponse>;
  post<TResponse>(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<TResponse>;
  patch<TResponse>(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<TResponse>;
  delete<TResponse>(
    path: string,
    options?: ApiRequestOptions,
  ): Promise<TResponse>;
}

const apiPrefix = "/api/v1";

export function createApiClient({
  authToken,
  baseUrl,
  fetcher = fetch,
}: ApiClientOptions): ApiClient {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  async function request<TResponse>(
    method: string,
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<TResponse> {
    const response = await fetcher(
      buildUrl(normalizedBaseUrl, path, options.query),
      {
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        headers: buildHeaders(authToken, options),
        method,
      },
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return response.json() as Promise<TResponse>;
  }

  return {
    delete: (path, options) => request("DELETE", path, options),
    get: (path, options) => request("GET", path, options),
    patch: (path, options) => request("PATCH", path, options),
    post: (path, options) => request("POST", path, options),
  };
}

export function buildUrl(
  normalizedBaseUrl: string,
  path: string,
  query?: QueryParams,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const versionedPath = normalizedPath.startsWith(apiPrefix)
    ? normalizedPath
    : `${apiPrefix}${normalizedPath}`;
  const url = `${normalizedBaseUrl}${versionedPath}`;
  const queryString = serializeQuery(query);

  return queryString ? `${url}?${queryString}` : url;
}

export function serializeQuery(query?: QueryParams): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();

  for (const key of Object.keys(query).sort()) {
    const value = query[key as keyof typeof query];
    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
      if (item === undefined || item === null) {
        continue;
      }

      if (
        typeof item !== "string" &&
        typeof item !== "number" &&
        typeof item !== "boolean"
      ) {
        continue;
      }

      params.append(key, String(item));
    }
  }

  return params.toString();
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(new RegExp(`${apiPrefix}/?$`), "").replace(/\/$/, "");
}

function buildHeaders(
  authToken: string | undefined,
  options: ApiRequestOptions,
): HeadersInit {
  return {
    ...(options.body === undefined
      ? {}
      : { "content-type": "application/json" }),
    ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };
}
