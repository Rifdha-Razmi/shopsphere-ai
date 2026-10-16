import { describe, expect, it } from "vitest";
import { RECOMMENDATION_STRATEGIES, type RecommendationSignals } from "@/types";
import { buildContext, getRecommendations, onlyAvailable, clearRecommendationCache } from "@/services/recommendations/recommendation.service";
import { setRecommendationProvider, getRecommendationProvider } from "@/services/recommendations/provider";
import { MockRecommendationEngine } from "@/services/recommendations/engine/mock-engine";
import { diversify } from "@/services/recommendations/engine/strategies";
import { snapshotCatalog } from "../helpers/catalog";
import { makeProduct } from "../helpers/factories";

const noSignals: RecommendationSignals = { recentlyViewed: [], searchHistory: [], wishlist: [], cart: [], purchases: [] };
const shopper: RecommendationSignals = {
  recentlyViewed: [{ productId: 124, at: 3 }, { productId: 122, at: 2 }, { productId: 100, at: 1 }], // iPhones + AirPods
  searchHistory: ["iphone"],
  wishlist: [78], // MacBook
  cart: [124],
  purchases: [],
};

const ids = (r: { items: { product: { id: number } }[] }) => r.items.map((i) => i.product.id);

describe("all nine strategies", () => {
  const ctx = buildContext({ catalog: snapshotCatalog, signals: shopper, now: 1 });

  it.each(RECOMMENDATION_STRATEGIES)("%s returns explainable, available, non-excluded items", async (strategy) => {
    clearRecommendationCache();
    const r = await getRecommendations({ strategy, productId: 124, category: "smartphones", limit: 8 }, ctx);
    expect(r.strategy).toBe(strategy);
    expect(r.title.length).toBeGreaterThan(0);
    expect(r.items.length).toBeGreaterThan(0);
    for (const item of r.items) expect(item.product.stock).toBeGreaterThan(0);
    if (strategy === "similar" || strategy === "frequently-bought") expect(ids(r)).not.toContain(124);
  });

  it("strategies produce visibly distinct results", async () => {
    clearRecommendationCache();
    const results = await Promise.all(["similar", "price", "wishlist", "cart", "trending", "personalized"].map((s) => getRecommendations({ strategy: s as never, productId: 124, limit: 8 }, ctx)));
    const signatures = new Set(results.map((r) => ids(r).join(",")));
    expect(signatures.size).toBe(results.length);
  });

  it("similar products for an iPhone are mostly smartphones", async () => {
    const r = await getRecommendations({ strategy: "similar", productId: 124, limit: 6 }, ctx);
    expect(r.items.filter((i) => i.product.category === "smartphones").length).toBeGreaterThanOrEqual(4);
  });

  it("cart-based suggests complements, not what's already in the cart", async () => {
    const r = await getRecommendations({ strategy: "cart", limit: 8 }, ctx);
    expect(ids(r)).not.toContain(124);
    expect(r.items.some((i) => i.product.category === "mobile-accessories")).toBe(true);
  });

  it("recently viewed preserves most-recent-first order (MOD-01-002)", async () => {
    const r = await getRecommendations({ strategy: "recently-viewed" }, ctx);
    expect(ids(r).slice(0, 3)).toEqual([124, 122, 100]);
  });

  it("price-based rail stays inside the shopper's band", async () => {
    const profile = getRecommendationProvider().buildProfile(ctx);
    const r = await getRecommendations({ strategy: "price", limit: 10 }, ctx);
    for (const i of r.items) {
      expect(i.product.price).toBeGreaterThanOrEqual(profile.priceBand!.min);
      expect(i.product.price).toBeLessThanOrEqual(profile.priceBand!.max);
    }
  });
});

describe("fallbacks and filtering", () => {
  it("first-time visitor: personalized falls back to 'Popular Right Now' (MOD-01-001)", async () => {
    clearRecommendationCache();
    const ctx = buildContext({ catalog: snapshotCatalog, signals: noSignals, now: 2 });
    const r = await getRecommendations({ strategy: "personalized", limit: 10 }, ctx, { fallback: "trending" });
    expect(r.isFallback).toBe(true);
    expect(r.title).toBe("Popular Right Now");
    const trending = await getRecommendations({ strategy: "trending", limit: 10 }, ctx);
    expect(ids(r)).not.toEqual(ids(trending)); // never a duplicate of the Trending rail
  });

  it("empty strategy without fallback returns no items (rail hides)", async () => {
    const ctx = buildContext({ catalog: snapshotCatalog, signals: noSignals, now: 3 });
    const r = await getRecommendations({ strategy: "wishlist" }, ctx, { fallback: "none" });
    expect(r.items).toHaveLength(0);
  });

  it("never recommends out-of-stock or archived products (edge case 23)", () => {
    const items = [makeProduct({ stock: 0 }), makeProduct({ archived: true }), makeProduct({ stock: 3 })].map((product) => ({ product, score: 1 }));
    expect(onlyAvailable(items)).toHaveLength(1);
  });

  it("diversify caps items per category", () => {
    const items = [...Array(6)].map((_, i) => ({ product: makeProduct({ category: i < 5 ? "a" : "b" }), score: 1 }));
    const out = diversify(items, 2, 3);
    expect(out.map((i) => i.product.category)).toEqual(["a", "a", "b"]);
  });

  it("the provider boundary is swappable without touching callers", async () => {
    clearRecommendationCache();
    const original = getRecommendationProvider();
    setRecommendationProvider({
      name: "fake-ml",
      buildProfile: (c) => new MockRecommendationEngine().buildProfile(c),
      recommend: async (req, c) => ({ strategy: req.strategy, title: "From ML", explanation: "", items: c.catalog.slice(0, 2).map((product) => ({ product, score: 1 })), isFallback: false }),
    });
    const ctx = buildContext({ catalog: snapshotCatalog, signals: shopper, now: 4 });
    const r = await getRecommendations({ strategy: "similar", productId: 1 }, ctx);
    expect(r.title).toBe("From ML");
    setRecommendationProvider(original);
  });
});
