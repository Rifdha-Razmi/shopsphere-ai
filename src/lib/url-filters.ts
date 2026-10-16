import { EMPTY_FILTERS, type Availability, type ProductFilters, type SortOption } from "@/types";

/**
 * Discovery state lives in the URL (PRD §5.3) so results are shareable and
 * browser back/forward works. These helpers are pure and unit-tested.
 */

export interface DiscoveryState {
  filters: ProductFilters;
  sort: SortOption;
  page: number;
}

const SORTS: SortOption[] = ["relevance", "price-asc", "price-desc", "rating", "newest"];
const AVAIL: Availability[] = ["all", "in-stock", "out-of-stock"];

function list(value: string | null): string[] {
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30) : [];
}

function num(value: string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseDiscoveryParams(params: URLSearchParams): DiscoveryState {
  const sort = params.get("sort") as SortOption | null;
  const availability = params.get("avail") as Availability | null;
  const rating = num(params.get("rating"));
  const page = Math.max(1, Math.floor(num(params.get("page")) ?? 1));
  return {
    filters: {
      ...EMPTY_FILTERS,
      categories: list(params.get("cat")),
      brands: list(params.get("brand")),
      minPrice: num(params.get("min")),
      maxPrice: num(params.get("max")),
      minRating: rating !== null && rating > 0 && rating <= 5 ? rating : null,
      availability: availability && AVAIL.includes(availability) ? availability : "all",
      onSale: params.get("sale") === "1",
    },
    sort: sort && SORTS.includes(sort) ? sort : "relevance",
    page,
  };
}

export function toDiscoveryParams(state: DiscoveryState, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  const q = base?.get("q");
  if (q) params.set("q", q);
  const f = state.filters;
  if (f.categories.length) params.set("cat", f.categories.join(","));
  if (f.brands.length) params.set("brand", f.brands.join(","));
  if (f.minPrice !== null) params.set("min", String(Math.round(f.minPrice)));
  if (f.maxPrice !== null) params.set("max", String(Math.round(f.maxPrice)));
  if (f.minRating !== null) params.set("rating", String(f.minRating));
  if (f.availability !== "all") params.set("avail", f.availability);
  if (f.onSale) params.set("sale", "1");
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function countActiveFilters(f: ProductFilters, opts: { ignoreCategories?: boolean } = {}): number {
  return (
    (opts.ignoreCategories ? 0 : f.categories.length) +
    f.brands.length +
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    (f.minRating !== null ? 1 : 0) +
    (f.availability !== "all" ? 1 : 0) +
    (f.onSale ? 1 : 0)
  );
}
