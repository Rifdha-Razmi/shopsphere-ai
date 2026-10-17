import type { Product, ProductFilters, SortOption } from "@/types";
import { normalizeText, tokenize } from "@/utils/text";

/**
 * Shared filtering + sorting infrastructure. Used by product discovery,
 * search results AND the AI assistant (PRD §7.3: the assistant is a new
 * entry point into existing services, not a parallel implementation).
 */

/** Edge case 7: min > max is auto-swapped, negatives are dropped. */
export function sanitizeFilters(filters: ProductFilters): ProductFilters {
  let { minPrice, maxPrice } = filters;
  if (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) minPrice = null;
  if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) maxPrice = null;
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  const minRating = filters.minRating !== null && filters.minRating > 0 ? Math.min(5, filters.minRating) : null;
  return { ...filters, minPrice, maxPrice, minRating };
}

export function productHasColor(product: Product, color: string): boolean {
  const c = color.toLowerCase();
  if (product.variants.some((v) => v.attributes.color?.toLowerCase() === c && v.stock > 0)) return true;
  return normalizeText(`${product.title} ${product.tags.join(" ")}`).split(" ").includes(c);
}

export function matchesQuery(product: Product, query: string): boolean {
  const terms = tokenize(query);
  if (terms.length === 0) return true;
  const haystack = normalizeText(`${product.title} ${product.brand} ${product.category} ${product.tags.join(" ")} ${product.description}`);
  return terms.every((t) => haystack.includes(t) || (t.endsWith("s") && haystack.includes(t.slice(0, -1))));
}

/** Any-of keyword match, used for product-type intents like "headphones". */
export function matchesAnyKeyword(product: Product, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const haystack = normalizeText(`${product.title} ${product.tags.join(" ")} ${product.description}`);
  return keywords.some((k) => haystack.includes(normalizeText(k)));
}

export function filterProducts(products: Product[], rawFilters: ProductFilters, opts: { keywords?: string[] } = {}): Product[] {
  const f = sanitizeFilters(rawFilters);
  const categories = new Set(f.categories);
  const brands = new Set(f.brands);
  return products.filter((p) => {
    if (p.archived) return false;
    if (categories.size && !categories.has(p.category)) return false;
    if (brands.size && !brands.has(p.brand)) return false;
    if (f.minPrice !== null && p.price < f.minPrice) return false;
    if (f.maxPrice !== null && p.price > f.maxPrice) return false;
    if (f.minRating !== null && p.rating < f.minRating) return false;
    if (f.availability === "in-stock" && p.stock <= 0) return false;
    if (f.availability === "out-of-stock" && p.stock > 0) return false;
    if (f.onSale && p.discountPercentage < 1) return false;
    if (f.query && !matchesQuery(p, f.query)) return false;
    if (f.color && !productHasColor(p, f.color)) return false;
    if (opts.keywords?.length && !matchesAnyKeyword(p, opts.keywords)) return false;
    return true;
  });
}

/** Simple relevance: title hits > tag/brand hits > description hits, then rating. */
export function relevanceScore(product: Product, query: string): number {
  const terms = tokenize(query);
  if (!terms.length) return product.rating;
  const title = normalizeText(product.title);
  const meta = normalizeText(`${product.brand} ${product.category} ${product.tags.join(" ")}`);
  let score = 0;
  for (const t of terms) {
    if (title.includes(t)) score += 3;
    if (meta.includes(t)) score += 2;
  }
  return score + product.rating / 5;
}

export function sortProducts(products: Product[], sort: SortOption, query = ""): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price || a.id - b.id);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price || a.id - b.id);
    case "rating":
      return list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "newest":
      return list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);
    case "relevance":
    default:
      if (!query.trim()) return list.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
      return list.sort((a, b) => relevanceScore(b, query) - relevanceScore(a, query));
  }
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, totalPages };
}

export interface Facets {
  brands: { value: string; count: number }[];
  categories: { value: string; count: number }[];
  priceRange: [number, number];
}

export function computeFacets(products: Product[]): Facets {
  const brands = new Map<string, number>();
  const categories = new Map<string, number>();
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    if (p.archived) continue;
    brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);
    categories.set(p.category, (categories.get(p.category) ?? 0) + 1);
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
  }
  const toList = (m: Map<string, number>) => [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return { brands: toList(brands), categories: toList(categories), priceRange: [Number.isFinite(min) ? Math.floor(min) : 0, Math.ceil(max)] };
}
