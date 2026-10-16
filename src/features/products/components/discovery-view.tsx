"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product, ProductFilters, SortOption } from "@/types";
import { EMPTY_FILTERS } from "@/types";
import { computeFacets, filterProducts, paginate, sanitizeFilters, sortProducts } from "@/services/catalog/filter";
import { countActiveFilters, parseDiscoveryParams, toDiscoveryParams, type DiscoveryState } from "@/lib/url-filters";
import { PAGE_SIZE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { suggestSpellings } from "@/utils/text";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useSearchResults } from "@/features/search/hooks/useSearch";
import { RecommendationRail } from "@/features/recommendations/components/recommendation-rail";
import { EmptyState, ErrorState, StaleDataBanner } from "@/components/common/state-views";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterPanel } from "./filter-panel";
import { ProductGrid, ProductGridSkeleton } from "./product-grid";
import { Pagination } from "./pagination";
import Link from "next/link";

export type DiscoveryMode = { kind: "all" } | { kind: "category"; slug: string } | { kind: "search"; query: string };

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevance",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Customer rating",
  newest: "Newest first",
};

function useBaseProducts(mode: DiscoveryMode) {
  const catalog = useCatalog();
  const search = useSearchResults(mode.kind === "search" ? mode.query : "");
  if (mode.kind === "search") {
    return { products: search.products, isLoading: search.isLoading, isError: search.isError, isStale: search.isStale, refetch: search.refetch, vocabulary: catalog.products };
  }
  const products = mode.kind === "category" ? catalog.products.filter((p) => p.category === mode.slug) : catalog.products;
  return { products, isLoading: catalog.isLoading, isError: catalog.isError, isStale: catalog.isStale, refetch: catalog.refetch, vocabulary: catalog.products };
}

function buildVocabulary(products: Product[]): string[] {
  const words = new Set<string>();
  for (const p of products) {
    words.add(p.brand);
    words.add(p.category.replace(/-/g, " "));
    for (const w of p.title.split(/\s+/)) if (w.length > 3) words.add(w);
    for (const t of p.tags) words.add(t);
  }
  return [...words];
}

/**
 * Shared discovery experience for /products, /category/[slug] and /search
 * (MOD-02/MOD-03). Filters, sort and page live in the URL.
 */
export function DiscoveryView({ mode }: { mode: DiscoveryMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { nameOf } = useCategories();
  const state = useMemo(() => parseDiscoveryParams(new URLSearchParams(params.toString())), [params]);
  const { products, isLoading, isError, isStale, refetch, vocabulary } = useBaseProducts(mode);

  const query = mode.kind === "search" ? mode.query : "";
  const filters = useMemo(() => sanitizeFilters({ ...state.filters, categories: mode.kind === "category" ? [] : state.filters.categories }), [state.filters, mode.kind]);
  const facets = useMemo(() => computeFacets(products), [products]);
  const filtered = useMemo(() => sortProducts(filterProducts(products, filters), state.sort, query), [products, filters, state.sort, query]);
  const { items, page, totalPages } = paginate(filtered, state.page, PAGE_SIZE);

  const update = useCallback(
    (next: Partial<DiscoveryState>) => {
      const merged: DiscoveryState = { ...state, ...next, page: next.page ?? 1 };
      const qs = toDiscoveryParams(merged, new URLSearchParams(params.toString())).toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: next.page !== undefined });
    },
    [state, params, pathname, router],
  );
  const setFilters = (f: ProductFilters) => update({ filters: f });
  const clearFilters = () => update({ filters: { ...EMPTY_FILTERS } });
  const activeCount = countActiveFilters(filters, { ignoreCategories: mode.kind === "category" });

  const title = mode.kind === "category" ? nameOf(mode.slug) : mode.kind === "search" ? `Results for “${mode.query}”` : "All products";
  const spelling = mode.kind === "search" && !isLoading && products.length === 0 ? suggestSpellings(mode.query, buildVocabulary(vocabulary)) : [];

  const chips: { label: string; remove: () => void }[] = [
    ...filters.categories.map((c) => ({ label: nameOf(c), remove: () => setFilters({ ...filters, categories: filters.categories.filter((x) => x !== c) }) })),
    ...filters.brands.map((b) => ({ label: b, remove: () => setFilters({ ...filters, brands: filters.brands.filter((x) => x !== b) }) })),
    ...(filters.minPrice !== null || filters.maxPrice !== null
      ? [{ label: `${filters.minPrice !== null ? formatPrice(filters.minPrice) : "₹0"} – ${filters.maxPrice !== null ? formatPrice(filters.maxPrice) : "Any"}`, remove: () => setFilters({ ...filters, minPrice: null, maxPrice: null }) }]
      : []),
    ...(filters.minRating !== null ? [{ label: `${filters.minRating}★ & up`, remove: () => setFilters({ ...filters, minRating: null }) }] : []),
    ...(filters.availability !== "all" ? [{ label: filters.availability === "in-stock" ? "In stock" : "Out of stock", remove: () => setFilters({ ...filters, availability: "all" }) }] : []),
    ...(filters.onSale ? [{ label: "On sale", remove: () => setFilters({ ...filters, onSale: false }) }] : []),
  ];

  const panel = <FilterPanel filters={filters} facets={facets} onChange={setFilters} categoryName={nameOf} showCategories={mode.kind !== "category"} />;

  return (
    <div className="container-page space-y-6 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      </div>

      {isStale && <StaleDataBanner onRetry={() => void refetch()} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-xl border bg-card px-4 py-2">
            <div className="flex items-center justify-between border-b py-2">
              <h2 className="text-sm font-semibold">Filters</h2>
              {activeCount > 0 && (
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="results-heading" className="text-sm text-muted-foreground" aria-live="polite">
              {isLoading ? "Loading products…" : <><span className="font-semibold text-foreground">{filtered.length.toLocaleString("en-IN")}</span> {filtered.length === 1 ? "product" : "products"}</>}
            </p>
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <SlidersHorizontal /> Filters{activeCount ? ` (${activeCount})` : ""}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>{filtered.length} matching products</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-4">{panel}</div>
                  <div className="border-t p-4">
                    <Button variant="outline" className="w-full" onClick={clearFilters} disabled={!activeCount}>
                      Clear all filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <NativeSelect id="sort" value={state.sort} onChange={(e) => update({ sort: e.target.value as SortOption })} className="w-48">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                  <option key={s} value={s}>
                    Sort: {SORT_LABELS[s]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.label}>
                  <button type="button" onClick={c.remove} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-xs font-medium hover:bg-muted" aria-label={`Remove filter ${c.label}`}>
                    {c.label} <X className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={clearFilters} className="px-2 py-1 text-xs font-medium text-primary hover:underline">
                  Clear all
                </button>
              </li>
            </ul>
          )}

          {isLoading ? (
            <ProductGridSkeleton count={10} />
          ) : isError ? (
            <ErrorState title="We couldn't load products" description={mode.kind === "search" ? "Search is unavailable right now. Please try again in a moment." : "The catalogue couldn't be loaded. Please try again."} onRetry={() => void refetch()} />
          ) : products.length === 0 && mode.kind === "search" ? (
            <EmptyState
              title={`No results for “${mode.query}”`}
              description={
                <div className="space-y-2">
                  <p>Check the spelling, or try a more general term.</p>
                  {spelling.length > 0 && (
                    <p>
                      Did you mean{" "}
                      {spelling.map((s, i) => (
                        <span key={s}>
                          {i > 0 && ", "}
                          <Link href={`/search?q=${encodeURIComponent(s)}`} className="font-medium text-primary underline">{s}</Link>
                        </span>
                      ))}
                      ?
                    </p>
                  )}
                </div>
              }
              action={{ label: "Browse all products", href: "/products" }}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No products match these filters"
              description={
                <div className="space-y-2">
                  <p>These filters returned no results:</p>
                  <p className="font-medium text-foreground">{chips.map((c) => c.label).join(" · ")}</p>
                </div>
              }
              action={{ label: "Clear filters", onClick: clearFilters }}
            />
          ) : (
            <>
              <ProductGrid products={items} />
              <Pagination page={page} totalPages={totalPages} onChange={(p) => update({ page: p })} />
            </>
          )}
        </section>
      </div>

      {mode.kind === "category" && <RecommendationRail request={{ strategy: "category", category: mode.slug, limit: 12 }} className="pt-6" />}
      {mode.kind === "search" && <RecommendationRail request={{ strategy: "price", limit: 12 }} className="pt-6" />}
    </div>
  );
}
