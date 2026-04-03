export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

import type { UseQueryOptions } from "@tanstack/react-query";

/**
 * Type-safe helper for callers that want to pass partial query options (enabled,
 * staleTime, etc.) to generated Orval hooks without providing queryKey.
 *
 * Generated hooks in TanStack Query v5 declare `query?: UseQueryOptions<...>`,
 * which requires queryKey. In practice the hook always overrides it with the
 * real endpoint key (`queryOptions?.queryKey ?? getXQueryKey(params)`), so
 * callers should never supply queryKey. Cast your options object through this
 * helper to satisfy the type without setting a key.
 *
 * Usage:
 *   useListModalities(params, { query: partialQuery({ staleTime: 300_000 }) })
 */
export function partialQuery<T, E = unknown, D = T>(
  options: Omit<UseQueryOptions<T, E, D>, "queryKey">,
): UseQueryOptions<T, E, D> {
  return options as UseQueryOptions<T, E, D>;
}
