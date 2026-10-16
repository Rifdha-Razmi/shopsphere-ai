"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchProducts } from "@/services/api/products.api";
import { applyOverrides } from "@/services/catalog/overrides";
import { matchesQuery } from "@/services/catalog/filter";
import { queryKeys } from "@/lib/query-keys";
import { MAX_SEARCH_LENGTH } from "@/lib/constants";
import { selectOverrides, useAdminStore } from "@/store/admin.store";
import { useShallow } from "zustand/react/shallow";
import { useHydrated } from "@/store/hydration.store";

/** Live suggestions — the caller passes an already-debounced query (MOD-03-001). */
export function useSearchSuggestions(debouncedQuery: string) {
  const q = debouncedQuery.trim().slice(0, MAX_SEARCH_LENGTH);
  return useQuery({
    queryKey: queryKeys.suggestions(q.toLowerCase()),
    queryFn: ({ signal }) => searchProducts(q, { limit: 6 }, signal),
    enabled: q.length >= 2, // edge case 5: empty input never fires a request
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/** Full search results, merged with local admin overrides and locally created products. */
export function useSearchResults(query: string) {
  const q = query.trim().slice(0, MAX_SEARCH_LENGTH);
  const overrides = useAdminStore(useShallow(selectOverrides));
  const hydrated = useHydrated();
  const result = useQuery({
    queryKey: queryKeys.search(q.toLowerCase()),
    queryFn: ({ signal }) => searchProducts(q, {}, signal),
    enabled: q.length > 0,
    staleTime: 60_000,
  });
  const products = useMemo(() => {
    const fromApi = applyOverrides((hydrated ? result.data?.products : undefined) ?? [], { ...overrides, created: [] });
    const local = overrides.created.filter((p) => matchesQuery(p, q));
    return [...fromApi, ...local].filter((p) => !p.archived);
  }, [result.data, overrides, q, hydrated]);

  return {
    products,
    isLoading: q.length > 0 && (!hydrated || result.isPending),
    isError: result.isError && !result.data,
    isStale: result.isError && !!result.data,
    refetch: result.refetch,
  };
}
