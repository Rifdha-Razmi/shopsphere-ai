import type { Product, ProductId, RecommendationContext, SignalProfile } from "@/types";
import { median, quantile } from "@/utils/math";
import { normalizeText } from "@/utils/text";

/**
 * Turns raw behavioural signals into a weighted preference profile.
 *
 * Signal weights:
 *   view          1.0 × recency decay (0.85^position, most recent first)
 *   wishlist      1.5
 *   cart          2.0
 *   purchase      1.5
 *   search term   0.6 (applied to categories / tags whose name matches the term)
 */
export const SIGNAL_WEIGHTS = { view: 1, wishlist: 1.5, cart: 2, purchase: 1.5, search: 0.6, decay: 0.85 } as const;

/** Signals needed before the engine trusts personalization fully (edge case 25). */
export const CONFIDENCE_SATURATION = 6;

function bump(map: Record<string, number>, key: string, amount: number) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + amount;
}

function normalizeMap(map: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(map));
  if (max <= 0) return {};
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v / max]));
}

export function buildSignalProfile(context: RecommendationContext): SignalProfile {
  const byId = new Map<ProductId, Product>(context.catalog.map((p) => [p.id, p]));
  const { signals } = context;

  const categories: Record<string, number> = {};
  const tags: Record<string, number> = {};
  const brands: Record<string, number> = {};
  const prices: number[] = [];

  const apply = (product: Product | undefined, weight: number) => {
    if (!product) return;
    bump(categories, product.category, weight);
    for (const t of product.tags) bump(tags, t, weight);
    bump(brands, product.brand, weight);
    prices.push(product.price);
  };

  const viewed = [...signals.recentlyViewed].sort((a, b) => b.at - a.at);
  const viewedIds = Array.from(new Set(viewed.map((v) => v.productId)));
  viewedIds.forEach((id, i) => apply(byId.get(id), SIGNAL_WEIGHTS.view * Math.pow(SIGNAL_WEIGHTS.decay, i)));
  signals.wishlist.forEach((id) => apply(byId.get(id), SIGNAL_WEIGHTS.wishlist));
  signals.cart.forEach((id) => apply(byId.get(id), SIGNAL_WEIGHTS.cart));
  const purchasedIds = Array.from(new Set(signals.purchases.map((p) => p.productId)));
  purchasedIds.forEach((id) => apply(byId.get(id), SIGNAL_WEIGHTS.purchase));

  // Search history infers interest categories/tags by name match.
  const searchTerms = signals.searchHistory.map(normalizeText).filter(Boolean);
  if (searchTerms.length) {
    const knownCategories = new Set(context.catalog.map((p) => p.category));
    const knownTags = new Set(context.catalog.flatMap((p) => p.tags));
    for (const term of searchTerms) {
      for (const c of knownCategories) if (normalizeText(c.replace(/-/g, " ")).includes(term) || term.includes(normalizeText(c.replace(/-/g, " ")))) bump(categories, c, SIGNAL_WEIGHTS.search);
      for (const word of term.split(" ")) if (knownTags.has(word)) bump(tags, word, SIGNAL_WEIGHTS.search);
    }
  }

  const priceBand = prices.length
    ? {
        min: Math.max(0, Math.round(quantile(prices, 0.2) * 0.75)),
        max: Math.round(quantile(prices, 0.8) * 1.3),
        median: Math.round(median(prices)),
      }
    : null;

  const totalSignals = viewedIds.length + signals.wishlist.length + signals.cart.length + purchasedIds.length + searchTerms.length;

  return {
    categoryAffinity: normalizeMap(categories),
    tagAffinity: normalizeMap(tags),
    brandAffinity: normalizeMap(brands),
    priceBand,
    viewedIds,
    wishlistIds: [...signals.wishlist],
    cartIds: [...signals.cart],
    purchasedIds,
    searchTerms,
    confidence: Math.min(1, totalSignals / CONFIDENCE_SATURATION),
    totalSignals,
  };
}

/** A profile built from a single seed product — used by the Similar Products strategy. */
export function seedProfile(seed: Product): SignalProfile {
  return {
    categoryAffinity: { [seed.category]: 1 },
    tagAffinity: Object.fromEntries(seed.tags.map((t) => [t, 1])),
    brandAffinity: { [seed.brand]: 1 },
    priceBand: { min: Math.round(seed.price * 0.6), max: Math.round(seed.price * 1.6), median: seed.price },
    viewedIds: [],
    wishlistIds: [],
    cartIds: [],
    purchasedIds: [],
    searchTerms: [],
    confidence: 1,
    totalSignals: 1,
  };
}

/** Top-N keys of an affinity map, strongest first. */
export function topKeys(map: Record<string, number>, n = 3): string[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}
