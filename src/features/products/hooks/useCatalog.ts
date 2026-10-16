"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product, ProductId } from "@/types";
import { fetchCatalog } from "@/services/api/products.api";
import { applyOverrides } from "@/services/catalog/overrides";
import { queryKeys } from "@/lib/query-keys";
import { useAdminStore, selectOverrides } from "@/store/admin.store";
import { useShallow } from "zustand/react/shallow";
import { useHydrated } from "@/store/hydration.store";

export const CATALOG_STALE_MS = 5 * 60_000;

/**
 * The full catalogue (server/cache state, TanStack Query) merged with local
 * admin overrides (client state, Zustand). If a refetch fails, the last
 * cached catalogue is still returned with `isStale` so the UI can show a
 * retry banner instead of a blank screen (edge case 3).
 */
export function useCatalog() {
  const query = useQuery({ queryKey: queryKeys.catalog, queryFn: ({ signal }) => fetchCatalog(signal), staleTime: CATALOG_STALE_MS });
  const overrides = useAdminStore(useShallow(selectOverrides));
  // Data restored from the persisted cache must not appear before hydration,
  // otherwise the first client render differs from the server HTML.
  const hydrated = useHydrated();
  const data = hydrated ? query.data : undefined;

  const products = useMemo<Product[]>(() => applyOverrides(data ?? [], overrides), [data, overrides]);
  const live = useMemo(() => products.filter((p) => !p.archived), [products]);
  const byId = useMemo(() => new Map<ProductId, Product>(products.map((p) => [p.id, p])), [products]);

  return {
    /** Every product, including archived ones (for order history/admin). */
    all: products,
    /** Storefront-visible products. */
    products: live,
    byId,
    isLoading: !hydrated || query.isPending,
    isError: hydrated && query.isError && !data,
    /** Showing cached data because the latest request failed. */
    isStale: query.isError && !!data,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    hasData: !!data,
  };
}
