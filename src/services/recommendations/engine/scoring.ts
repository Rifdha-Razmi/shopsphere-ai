import type { Product, ProductId, ScoreBreakdown, SignalProfile } from "@/types";

/**
 * Weighted composite scoring model (PRD §6.2).
 *
 *   score(product) = w1·categoryMatch + w2·priceSimilarity + w3·tagOverlap
 *                  + w4·normalizedRating + w5·recentlyViewedRelation
 *                  + w6·wishlistRelation + w7·cartRelation
 *
 * Every component returns a value in [0, 1] before weighting, and the default
 * weights sum to 1, so the composite score is also in [0, 1] and no single
 * signal can dominate unintentionally.
 */

export type ScoringWeights = Record<keyof ScoreBreakdown, number>;

export const DEFAULT_WEIGHTS: ScoringWeights = {
  categoryMatch: 0.24,
  priceSimilarity: 0.14,
  tagOverlap: 0.18,
  normalizedRating: 0.1,
  recentlyViewedRelation: 0.14,
  wishlistRelation: 0.08,
  cartRelation: 0.12,
};

/** Similar Products weights: only the seed's category, tags and price matter, plus quality. */
export const SIMILAR_WEIGHTS: ScoringWeights = {
  categoryMatch: 0.3,
  priceSimilarity: 0.25,
  tagOverlap: 0.33,
  normalizedRating: 0.12,
  recentlyViewedRelation: 0,
  wishlistRelation: 0,
  cartRelation: 0,
};

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function categoryMatch(product: Product, profile: SignalProfile): number {
  return clamp01(profile.categoryAffinity[product.category] ?? 0);
}

/**
 * 1 at the profile's median price, decaying with the log price ratio and
 * reaching 0 at a 3× difference. Log scale keeps ₹500 vs ₹1,000 as "far" as
 * ₹50,000 vs ₹100,000.
 */
export function priceSimilarity(product: Product, profile: SignalProfile): number {
  const band = profile.priceBand;
  if (!band || band.median <= 0 || product.price <= 0) return 0;
  const ratio = Math.abs(Math.log(product.price / band.median));
  return clamp01(1 - ratio / Math.log(3));
}

/** Mean affinity of the product's tags (0 when the product has no tags). */
export function tagOverlap(product: Product, profile: SignalProfile): number {
  if (product.tags.length === 0) return 0;
  const sum = product.tags.reduce((acc, t) => acc + (profile.tagAffinity[t] ?? 0), 0);
  return clamp01(sum / product.tags.length);
}

/** Rating on 0–1, damped for products with very few reviews. */
export function normalizedRating(product: Product): number {
  const confidence = Math.min(1, (product.reviewCount + 1) / 4);
  return clamp01((product.rating / 5) * (0.7 + 0.3 * confidence));
}

/** Pairwise similarity used by the relation components: category (50%) + tag Jaccard (50%). */
export function productSimilarity(a: Product, b: Product): number {
  if (a.id === b.id) return 0;
  const sameCategory = a.category === b.category ? 1 : 0;
  const tagsA = new Set(a.tags);
  const union = new Set([...a.tags, ...b.tags]);
  const intersection = b.tags.filter((t) => tagsA.has(t)).length;
  const jaccard = union.size ? intersection / union.size : 0;
  return clamp01(0.5 * sameCategory + 0.5 * jaccard);
}

function maxRelation(product: Product, seeds: Product[], decay?: number): number {
  let best = 0;
  seeds.forEach((seed, i) => {
    const weight = decay ? Math.pow(decay, i) : 1;
    best = Math.max(best, productSimilarity(product, seed) * weight);
  });
  return clamp01(best);
}

/** Relation to recently viewed items, most recent weighted highest. */
export function recentlyViewedRelation(product: Product, viewed: Product[]): number {
  return maxRelation(product, viewed, 0.9);
}

export function wishlistRelation(product: Product, wishlist: Product[]): number {
  return maxRelation(product, wishlist);
}

/** Relation to cart items: similarity, or co-purchase strength when higher. */
export function cartRelation(product: Product, cart: Product[], coOccurrence: Record<string, number> = {}): number {
  const similarity = maxRelation(product, cart);
  const maxCount = Math.max(1, ...Object.values(coOccurrence));
  const co = cart.reduce((best, c) => Math.max(best, (coOccurrence[pairKey(product.id, c.id)] ?? 0) / maxCount), 0);
  return clamp01(Math.max(similarity, co));
}

export function pairKey(a: ProductId, b: ProductId): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export interface ScoringInput {
  profile: SignalProfile;
  viewed: Product[];
  wishlist: Product[];
  cart: Product[];
  coOccurrence?: Record<string, number>;
}

export function scoreBreakdown(product: Product, input: ScoringInput): ScoreBreakdown {
  return {
    categoryMatch: categoryMatch(product, input.profile),
    priceSimilarity: priceSimilarity(product, input.profile),
    tagOverlap: tagOverlap(product, input.profile),
    normalizedRating: normalizedRating(product),
    recentlyViewedRelation: recentlyViewedRelation(product, input.viewed),
    wishlistRelation: wishlistRelation(product, input.wishlist),
    cartRelation: cartRelation(product, input.cart, input.coOccurrence),
  };
}

export function compositeScore(breakdown: ScoreBreakdown, weights: ScoringWeights = DEFAULT_WEIGHTS): number {
  let score = 0;
  for (const key of Object.keys(weights) as (keyof ScoreBreakdown)[]) {
    score += weights[key] * breakdown[key];
  }
  return score;
}

/** The strongest contributing component, phrased for shoppers. */
export function explainBreakdown(breakdown: ScoreBreakdown, product: Product, weights: ScoringWeights = DEFAULT_WEIGHTS): string {
  const labels: Record<keyof ScoreBreakdown, string> = {
    categoryMatch: `You often browse ${product.category.replace(/-/g, " ")}`,
    priceSimilarity: "In your usual price range",
    tagOverlap: "Matches your interests",
    normalizedRating: "Highly rated",
    recentlyViewedRelation: "Related to items you viewed",
    wishlistRelation: "Like items in your wishlist",
    cartRelation: "Goes with your cart",
  };
  const top = (Object.keys(weights) as (keyof ScoreBreakdown)[])
    .map((k) => [k, weights[k] * breakdown[k]] as const)
    .sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? labels[top[0]] : "Popular with shoppers";
}
