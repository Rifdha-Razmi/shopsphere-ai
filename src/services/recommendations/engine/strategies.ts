import type { Product, ProductId, RecommendationContext, RecommendationRequest, RecommendationResult, RecommendationStrategy, ScoredProduct, SignalProfile } from "@/types";
import { humanizeSlug, formatPrice } from "@/lib/format";
import { DEFAULT_WEIGHTS, SIMILAR_WEIGHTS, compositeScore, explainBreakdown, normalizedRating, pairKey, productSimilarity, scoreBreakdown, type ScoringInput } from "./scoring";
import { seedProfile, topKeys } from "./signals";
import { truncate } from "@/utils/text";

/**
 * The nine recommendation strategies (PRD §6.3). Each is a pure function of
 * (request, context, profile) → result. They never touch React or storage.
 */

export type StrategyResult = Omit<RecommendationResult, "isFallback">;
type Strategy = (req: RecommendationRequest, ctx: RecommendationContext, profile: SignalProfile, helpers: Helpers) => StrategyResult;

interface Helpers {
  byId: Map<ProductId, Product>;
  pick: (ids: ProductId[]) => Product[];
  scoringInput: ScoringInput;
  popularity: (p: Product) => number;
}

/** Complementary categories for cart / frequently-bought-together. */
export const COMPLEMENTS: Record<string, string[]> = {
  smartphones: ["mobile-accessories", "tablets"],
  laptops: ["mobile-accessories", "tablets"],
  tablets: ["mobile-accessories", "laptops"],
  "mobile-accessories": ["smartphones", "tablets"],
  "mens-shirts": ["mens-shoes", "mens-watches", "sunglasses"],
  "mens-shoes": ["mens-shirts", "sports-accessories", "mens-watches"],
  "mens-watches": ["mens-shirts", "sunglasses"],
  tops: ["womens-bags", "womens-jewellery", "womens-shoes"],
  "womens-dresses": ["womens-shoes", "womens-bags", "womens-jewellery"],
  "womens-shoes": ["womens-dresses", "womens-bags"],
  "womens-bags": ["womens-dresses", "womens-jewellery", "sunglasses"],
  "womens-watches": ["womens-jewellery", "womens-bags"],
  "womens-jewellery": ["womens-dresses", "womens-watches"],
  beauty: ["skin-care", "fragrances"],
  "skin-care": ["beauty", "fragrances"],
  fragrances: ["beauty", "skin-care"],
  furniture: ["home-decoration", "kitchen-accessories"],
  "home-decoration": ["furniture", "kitchen-accessories"],
  "kitchen-accessories": ["groceries", "home-decoration"],
  groceries: ["kitchen-accessories"],
  "sports-accessories": ["mens-shoes", "sunglasses"],
  sunglasses: ["mens-watches", "womens-bags"],
  motorcycle: ["vehicle", "sunglasses"],
  vehicle: ["motorcycle", "sunglasses"],
};

function excludeSet(req: RecommendationRequest, extra: ProductId[] = []): Set<ProductId> {
  return new Set([...(req.exclude ?? []), ...extra, ...(req.productId ? [req.productId] : [])]);
}

/** Caps how many items one category contributes so rails stay varied. */
export function diversify(items: ScoredProduct[], maxPerCategory: number, limit: number): ScoredProduct[] {
  const counts = new Map<string, number>();
  const picked: ScoredProduct[] = [];
  const overflow: ScoredProduct[] = [];
  for (const item of items) {
    const n = counts.get(item.product.category) ?? 0;
    if (n < maxPerCategory) {
      picked.push(item);
      counts.set(item.product.category, n + 1);
    } else overflow.push(item);
    if (picked.length >= limit) break;
  }
  return picked.length >= limit ? picked : [...picked, ...overflow].slice(0, limit);
}

const byScore = (a: ScoredProduct, b: ScoredProduct) => b.score - a.score || b.product.rating - a.product.rating || a.product.id - b.product.id;

function rankWithProfile(candidates: Product[], helpers: Helpers, weights = DEFAULT_WEIGHTS): ScoredProduct[] {
  return candidates
    .map((product) => {
      const breakdown = scoreBreakdown(product, helpers.scoringInput);
      return { product, score: compositeScore(breakdown, weights), breakdown, reason: explainBreakdown(breakdown, product, weights) };
    })
    .sort(byScore);
}

const names = (products: Product[], n = 2) => products.slice(0, n).map((p) => truncate(p.title, 28)).join(", ");

// 1 — Recently Viewed
const recentlyViewed: Strategy = (req, _ctx, profile, h) => {
  const exclude = excludeSet(req);
  const items = h.pick(profile.viewedIds).filter((p) => !exclude.has(p.id)).map((product) => ({ product, score: 1, reason: "You viewed this recently" }));
  return { strategy: "recently-viewed", title: "Recently Viewed", explanation: "Products you looked at, most recent first.", items };
};

// 2 — Similar Products (seed: category + tags + price of the current product)
const similar: Strategy = (req, ctx, _profile, h) => {
  const seed = req.productId ? h.byId.get(req.productId) : undefined;
  if (!seed) return { strategy: "similar", title: "Similar Products", explanation: "", items: [] };
  const exclude = excludeSet(req);
  const input: ScoringInput = { profile: seedProfile(seed), viewed: [], wishlist: [], cart: [] };
  const items = ctx.catalog
    .filter((p) => !exclude.has(p.id))
    .map((product) => {
      const breakdown = scoreBreakdown(product, input);
      const reasons = [];
      if (product.category === seed.category) reasons.push(`Also in ${humanizeSlug(product.category)}`);
      if (breakdown.priceSimilarity > 0.6) reasons.push("similar price");
      if (breakdown.tagOverlap > 0 && product.category !== seed.category) reasons.push("shared tags");
      return { product, score: compositeScore(breakdown, SIMILAR_WEIGHTS), breakdown, reason: reasons.join(" · ") || "Similar style" };
    })
    .filter((s) => (s.breakdown?.categoryMatch ?? 0) > 0 || (s.breakdown?.tagOverlap ?? 0) > 0)
    .sort(byScore);
  return { strategy: "similar", title: "Similar Products", explanation: `Matched on category, tags and price of ${truncate(seed.title, 40)}.`, items };
};

// 3 — Category-Based (requested or dominant browsed category)
const category: Strategy = (req, ctx, profile, h) => {
  const cat = req.category ?? topKeys(profile.categoryAffinity, 1)[0];
  if (!cat) return { strategy: "category", title: "Top Picks", explanation: "", items: [] };
  const exclude = excludeSet(req, profile.viewedIds.slice(0, 3));
  const candidates = ctx.catalog.filter((p) => p.category === cat && !exclude.has(p.id));
  const items = rankWithProfile(candidates, h).map((s) => ({ ...s, reason: s.reason ?? `Top in ${humanizeSlug(cat)}` }));
  const fromBrowsing = !req.category;
  return {
    strategy: "category",
    title: fromBrowsing ? `Because You Browse ${humanizeSlug(cat)}` : `More in ${humanizeSlug(cat)}`,
    explanation: fromBrowsing ? `${humanizeSlug(cat)} is the category you engage with most.` : `Best matches for you in ${humanizeSlug(cat)}.`,
    items,
  };
};

// 4 — Price-Based (customer's typical price band, across categories)
const price: Strategy = (req, ctx, profile, h) => {
  const band = profile.priceBand;
  if (!band) return { strategy: "price", title: "In Your Price Range", explanation: "", items: [] };
  const exclude = excludeSet(req, [...profile.viewedIds, ...profile.cartIds]);
  const candidates = ctx.catalog.filter((p) => p.price >= band.min && p.price <= band.max && !exclude.has(p.id));
  const items = candidates
    .map((product) => {
      const breakdown = scoreBreakdown(product, h.scoringInput);
      const score = 0.45 * breakdown.priceSimilarity + 0.3 * breakdown.normalizedRating + 0.25 * Math.max(breakdown.categoryMatch, breakdown.tagOverlap);
      return { product, score, breakdown, reason: `${formatPrice(product.price)} · fits your budget` };
    })
    .sort(byScore);
  return {
    strategy: "price",
    title: `In Your Price Range (${formatPrice(band.min)}–${formatPrice(band.max)})`,
    explanation: `Your typical spend, based on items you viewed, saved and added: ${formatPrice(band.min)}–${formatPrice(band.max)}.`,
    items: diversify(items, 2, items.length),
  };
};

// 5 — Wishlist-Based
const wishlist: Strategy = (req, ctx, profile, h) => {
  const seeds = h.pick(profile.wishlistIds);
  if (!seeds.length) return { strategy: "wishlist", title: "Because of Your Wishlist", explanation: "", items: [] };
  const exclude = excludeSet(req, profile.wishlistIds);
  const items = ctx.catalog
    .filter((p) => !exclude.has(p.id))
    .map((product) => {
      let best = 0;
      let match: Product | undefined;
      for (const s of seeds) {
        const sim = productSimilarity(product, s);
        if (sim > best) [best, match] = [sim, s];
      }
      return { product, score: 0.8 * best + 0.2 * normalizedRating(product), reason: match ? `Like ${truncate(match.title, 26)}` : undefined };
    })
    .filter((s) => s.score > 0.25)
    .sort(byScore);
  return { strategy: "wishlist", title: "Because of Your Wishlist", explanation: `Based on ${names(seeds)}${seeds.length > 2 ? ` and ${seeds.length - 2} more` : ""} in your wishlist.`, items };
};

// 6 — Cart-Based (complements + co-purchase of what's in the cart)
const cart: Strategy = (req, ctx, profile, h) => {
  const seeds = h.pick(profile.cartIds);
  if (!seeds.length) return { strategy: "cart", title: "Complete Your Order", explanation: "", items: [] };
  const exclude = excludeSet(req, profile.cartIds);
  const complementCats = new Set(seeds.flatMap((s) => COMPLEMENTS[s.category] ?? []));
  const maxCo = Math.max(1, ...Object.values(ctx.coOccurrence));
  const items = ctx.catalog
    .filter((p) => !exclude.has(p.id))
    .map((product) => {
      const co = seeds.reduce((m, s) => Math.max(m, (ctx.coOccurrence[pairKey(product.id, s.id)] ?? 0) / maxCo), 0);
      const complement = complementCats.has(product.category) ? 1 : 0;
      const cheaperAddOn = product.price <= Math.max(...seeds.map((s) => s.price)) ? 1 : 0.4;
      const score = 0.4 * co + 0.3 * complement + 0.15 * normalizedRating(product) + 0.15 * cheaperAddOn;
      return { product, score, reason: co > 0 ? "Often bought with items in your cart" : complement ? `Pairs with your ${humanizeSlug(seeds[0].category).toLowerCase()}` : undefined };
    })
    .filter((s) => s.score > 0.35)
    .sort(byScore);
  return { strategy: "cart", title: "Goes Well With Your Cart", explanation: `Add-ons that complement ${names(seeds)}.`, items: diversify(items, 3, items.length) };
};

// 7 — Frequently Bought Together (co-occurrence in seed + local orders)
const frequentlyBought: Strategy = (req, ctx, _profile, h) => {
  const seed = req.productId ? h.byId.get(req.productId) : undefined;
  if (!seed) return { strategy: "frequently-bought", title: "Frequently Bought Together", explanation: "", items: [] };
  const exclude = excludeSet(req);
  const complementCats = new Set(COMPLEMENTS[seed.category] ?? []);
  const items = ctx.catalog
    .filter((p) => !exclude.has(p.id))
    .map((product) => {
      const count = ctx.coOccurrence[pairKey(seed.id, product.id)] ?? 0;
      // Co-occurrence dominates; complements fill gaps when data is sparse.
      const score = count * 10 + (complementCats.has(product.category) ? 1 + normalizedRating(product) : 0);
      return { product, score, reason: count > 0 ? `Bought together ${count}× by shoppers` : `Pairs well with ${humanizeSlug(seed.category).toLowerCase()}` };
    })
    .filter((s) => s.score > 0)
    .sort(byScore);
  return { strategy: "frequently-bought", title: "Frequently Bought Together", explanation: `Shoppers who bought ${truncate(seed.title, 36)} also picked these.`, items: diversify(items, 2, items.length) };
};

// 8 — Trending (mock popularity + rating velocity)
const trending: Strategy = (req, ctx, _profile, h) => {
  const exclude = excludeSet(req);
  const items = ctx.catalog
    .filter((p) => !exclude.has(p.id))
    .map((product) => ({ product, score: h.popularity(product), reason: "Trending this week" }))
    .sort(byScore);
  return { strategy: "trending", title: "Trending Now", explanation: "Most popular with ShopSphere shoppers this week.", items: diversify(items, 2, items.length) };
};

// 9 — Personalized For You (weighted blend of all signals, blended with popularity by confidence)
const personalized: Strategy = (req, ctx, profile, h) => {
  const exclude = excludeSet(req, [...profile.cartIds, ...profile.purchasedIds, ...profile.viewedIds.slice(0, 2)]);
  const conf = profile.confidence;
  const items = ctx.catalog
    .filter((p) => !exclude.has(p.id))
    .map((product) => {
      const breakdown = scoreBreakdown(product, h.scoringInput);
      const personal = compositeScore(breakdown, DEFAULT_WEIGHTS);
      // Edge case 25: with few signals, lean on general popularity instead of over-fitting.
      const score = conf * personal + (1 - conf) * h.popularity(product);
      return { product, score, breakdown, reason: explainBreakdown(breakdown, product) };
    })
    .sort(byScore);
  const viewed = h.pick(profile.viewedIds);
  const topCats = topKeys(profile.categoryAffinity, 2).map(humanizeSlug);
  return {
    strategy: "personalized",
    title: "Recommended For You",
    explanation: viewed.length
      ? `Because you viewed ${names(viewed)}${topCats.length ? ` · interests: ${topCats.join(", ")}` : ""}.`
      : topCats.length
        ? `Based on your interest in ${topCats.join(" and ")}.`
        : "Based on what's popular while we learn your taste.",
    items: diversify(items, 3, items.length),
  };
};

export const STRATEGIES: Record<RecommendationStrategy, Strategy> = {
  "recently-viewed": recentlyViewed,
  similar,
  category,
  price,
  wishlist,
  cart,
  "frequently-bought": frequentlyBought,
  trending,
  personalized,
};

export function buildHelpers(ctx: RecommendationContext, profile: SignalProfile): Helpers {
  const byId = new Map(ctx.catalog.map((p) => [p.id, p]));
  const pick = (ids: ProductId[]) => ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  const maxPop = Math.max(1, ...Object.values(ctx.popularity));
  const popularity = (p: Product) => {
    const seeded = (ctx.popularity[String(p.id)] ?? 0) / maxPop;
    const quality = normalizedRating(p);
    const momentum = Math.min(1, Math.log10(p.reviewCount + 1) / 1.2);
    return 0.5 * seeded + 0.35 * quality + 0.15 * momentum;
  };
  return {
    byId,
    pick,
    popularity,
    scoringInput: { profile, viewed: pick(profile.viewedIds), wishlist: pick(profile.wishlistIds), cart: pick(profile.cartIds), coOccurrence: ctx.coOccurrence },
  };
}
