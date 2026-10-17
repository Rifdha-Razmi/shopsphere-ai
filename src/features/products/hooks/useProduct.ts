"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/types";
import { ApiError } from "@/services/api/http";
import { fetchProduct } from "@/services/api/products.api";
import { applyOverrides } from "@/services/catalog/overrides";
import { queryKeys } from "@/lib/query-keys";
import { selectOverrides, useAdminStore } from "@/store/admin.store";
import { useShallow } from "zustand/react/shallow";
import { useHydrated } from "@/store/hydration.store";

export type ProductState =
  | { status: "loading" }
  | { status: "unavailable" } // removed from the API / deleted / archived (edge case 2)
  | { status: "error"; error: unknown; retry: () => void }
  | { status: "ready"; product: Product; isStale: boolean };

export function useProduct(id: number): ProductState {
  const queryClient = useQueryClient();
  const overrides = useAdminStore(useShallow(selectOverrides));
  const local = overrides.created.find((p) => p.id === id);
  const valid = Number.isInteger(id) && id > 0;
  const hydrated = useHydrated();

  const query = useQuery({
    queryKey: queryKeys.product(id),
    queryFn: ({ signal }) => fetchProduct(id, signal),
    enabled: valid && !local,
    // Seed from the catalogue cache so navigation from a grid is instant.
    initialData: () => queryClient.getQueryData<Product[]>(queryKeys.catalog)?.find((p) => p.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(queryKeys.catalog)?.dataUpdatedAt,
    retry: (count, error) => !(error instanceof ApiError && error.kind === "not-found") && count < 2,
  });

  return useMemo<ProductState>(() => {
    if (!hydrated) return { status: "loading" };
    if (!valid) return { status: "unavailable" };
    if (overrides.deleted.includes(id)) return { status: "unavailable" };
    const source = local ?? query.data;
    if (source) {
      const [product] = applyOverrides([source], { ...overrides, created: [] });
      if (!product || product.archived) return { status: "unavailable" };
      return { status: "ready", product, isStale: query.isError };
    }
    if (query.isError) {
      if (query.error instanceof ApiError && query.error.kind === "not-found") return { status: "unavailable" };
      return { status: "error", error: query.error, retry: () => void query.refetch() };
    }
    return { status: "loading" };
  }, [hydrated, valid, overrides, id, local, query]);
}
