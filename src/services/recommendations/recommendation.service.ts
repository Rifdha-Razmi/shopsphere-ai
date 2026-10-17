import type { Order, Product, ProductId, RecommendationContext, RecommendationRequest, RecommendationResult, RecommendationSignals, ScoredProduct, SignalProfile } from "@/types";
import { getRecommendationProvider } from "./provider";
import { pairKey } from "./engine/scoring";
import seed from "@/mocks/recommendations.json";

/**
 * Recommendation Service — orchestration, signal assembly and caching
 * (PRD §6.4). UI code talks to this layer only through the
 * `useRecommendations()` hook; it never sees scoring logic.
 */

export interface ServiceOptions {
  /** What to do when the strategy has no candidates. */
  fallback?: "trending" | "none";
}

const DEFAULT_LIMIT = 10;
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; value: RecommendationResult }>();

interface SeedData {
  frequentlyBoughtTogether: [number, number, number][];
  popularity: Record<string, number>;
}
const seedData = seed as unknown as SeedData;

/** Merges seed co-occurrence with pairs observed in local orders. */
export function buildCoOccurrence(orders: Pick<Order, "lines">[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [a, b, n] of seedData.frequentlyBoughtTogether) counts[pairKey(a, b)] = (counts[pairKey(a, b)] ?? 0) + n;
  for (const order of orders) {
    const ids = Array.from(new Set(order.lines.map((l) => l.productId)));
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) counts[pairKey(ids[i], ids[j])] = (counts[pairKey(ids[i], ids[j])] ?? 0) + 1;
  }
  return counts;
}

export function buildContext(input: { catalog: Product[]; signals: RecommendationSignals; orders?: Pick<Order, "lines">[]; now?: number }): RecommendationContext {
  return {
    catalog: input.catalog.filter((p) => !p.archived),
    signals: input.signals,
    coOccurrence: buildCoOccurrence(input.orders ?? []),
    popularity: seedData.popularity,
    now: input.now ?? Date.now(),
  };
}

/** Edge case 23: never recommend removed or out-of-stock products. */
export function onlyAvailable(items: ScoredProduct[]): ScoredProduct[] {
  return items.filter((i) => !i.product.archived && i.product.stock > 0);
}

function cacheKey(request: RecommendationRequest, ctx: RecommendationContext, options: ServiceOptions): string {
  const s = ctx.signals;
  return JSON.stringify([
    getRecommendationProvider().name,
    request,
    options.fallback,
    ctx.catalog.length,
    ctx.catalog.reduce((h, p) => (h * 31 + p.id * 7 + p.stock + Math.round(p.price)) % 1_000_000_007, 7),
    s.recentlyViewed.map((v) => v.productId),
    s.wishlist,
    s.cart,
    s.purchases.length,
    s.searchHistory,
  ]);
}

export async function getRecommendations(request: RecommendationRequest, ctx: RecommendationContext, options: ServiceOptions = {}): Promise<RecommendationResult> {
  const key = cacheKey(request, ctx, options);
  const hit = cache.get(key);
  if (hit && ctx.now - hit.at < CACHE_TTL_MS) return hit.value;

  const limit = request.limit ?? DEFAULT_LIMIT;
  const provider = getRecommendationProvider();
  const primary = await provider.recommend(request, ctx);
  let result: RecommendationResult = { ...primary, items: onlyAvailable(primary.items).slice(0, limit) };

  // Edge case 16: empty strategies fall back to Trending rather than rendering an empty box.
  // A brand-new visitor has no signals: "personalized" would just mirror Trending, so it falls back too (MOD-01-001).
  const noSignals = request.strategy === "personalized" && provider.buildProfile(ctx).totalSignals === 0;
  if ((result.items.length === 0 || noSignals) && options.fallback === "trending" && request.strategy !== "trending") {
    const trending = await provider.recommend({ strategy: "trending", exclude: request.exclude, productId: request.productId }, ctx);
    const available = onlyAvailable(trending.items);
    // Skip the head of the Trending list so this rail never duplicates the "Trending Now" rail on the same page.
    const pool = available.length > limit * 2 ? available.slice(limit) : available;
    result = {
      ...trending,
      title: "Popular Right Now",
      explanation: "We'll personalize this as you browse — here's what other shoppers love meanwhile.",
      items: pool.slice(0, limit),
      isFallback: true,
    };
  }

  cache.set(key, { at: ctx.now, value: result });
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  return result;
}

export function getSignalProfile(ctx: RecommendationContext): SignalProfile {
  return getRecommendationProvider().buildProfile(ctx);
}

export function clearRecommendationCache(): void {
  cache.clear();
}

/**
 * Conceptual REST-style endpoints (PRD §6.4), implemented as service functions.
 * A future backend would expose exactly these routes.
 */
export const recommendationEndpoints = {
  "GET /recommendations/personalized": (ctx: RecommendationContext, limit?: number) => getRecommendations({ strategy: "personalized", limit }, ctx, { fallback: "trending" }),
  "GET /recommendations/similar/:productId": (productId: ProductId, ctx: RecommendationContext, limit?: number) => getRecommendations({ strategy: "similar", productId, limit }, ctx, { fallback: "trending" }),
  "GET /recommendations/trending": (ctx: RecommendationContext, limit?: number) => getRecommendations({ strategy: "trending", limit }, ctx),
  "GET /recommendations/frequently-bought/:productId": (productId: ProductId, ctx: RecommendationContext, limit?: number) =>
    getRecommendations({ strategy: "frequently-bought", productId, limit }, ctx, { fallback: "none" }),
} as const;
