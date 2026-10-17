"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@/types";
import { fetchCategories } from "@/services/api/products.api";
import { queryKeys } from "@/lib/query-keys";
import { useAdminStore } from "@/store/admin.store";
import { humanizeSlug } from "@/lib/format";
import { useHydrated } from "@/store/hydration.store";

export function useCategories() {
  const query = useQuery({ queryKey: queryKeys.categories, queryFn: ({ signal }) => fetchCategories(signal), staleTime: 30 * 60_000 });
  const names = useAdminStore((s) => s.categoryNames);
  const hydrated = useHydrated();
  const data = hydrated ? query.data : undefined;

  const categories = useMemo<Category[]>(() => {
    const base = (data ?? []).map((c) => ({ slug: c.slug, name: names[c.slug] ?? c.name ?? humanizeSlug(c.slug) }));
    const extra = Object.entries(names)
      .filter(([slug]) => !base.some((c) => c.slug === slug))
      .map(([slug, name]) => ({ slug, name }));
    return [...base, ...extra];
  }, [data, names]);

  const nameOf = useMemo(() => {
    const map = new Map(categories.map((c) => [c.slug, c.name]));
    return (slug: string) => map.get(slug) ?? humanizeSlug(slug);
  }, [categories]);

  return { categories, nameOf, isLoading: !hydrated || query.isPending, isError: hydrated && query.isError && !data, refetch: query.refetch };
}
