import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, SIMILAR_WEIGHTS, cartRelation, categoryMatch, compositeScore, normalizedRating, pairKey, priceSimilarity, productSimilarity, recentlyViewedRelation, scoreBreakdown, tagOverlap, wishlistRelation } from "@/services/recommendations/engine/scoring";
import { buildSignalProfile, seedProfile } from "@/services/recommendations/engine/signals";
import type { SignalProfile } from "@/types";
import { makeProduct } from "../helpers/factories";

const profile = (p: Partial<SignalProfile>): SignalProfile => ({
  categoryAffinity: {}, tagAffinity: {}, brandAffinity: {}, priceBand: null, viewedIds: [], wishlistIds: [], cartIds: [], purchasedIds: [], searchTerms: [], confidence: 1, totalSignals: 1, ...p,
});

describe("scoring components (each normalized to 0–1)", () => {
  it("weights sum to 1 so the composite stays in [0, 1]", () => {
    const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum(DEFAULT_WEIGHTS)).toBeCloseTo(1, 5);
    expect(sum(SIMILAR_WEIGHTS)).toBeCloseTo(1, 5);
  });

  it("categoryMatch reads category affinity", () => {
    const p = makeProduct({ category: "mens-shoes" });
    expect(categoryMatch(p, profile({ categoryAffinity: { "mens-shoes": 0.8 } }))).toBe(0.8);
    expect(categoryMatch(p, profile({}))).toBe(0);
  });

  it("priceSimilarity is 1 at the median and 0 at a 3× ratio", () => {
    const band = { min: 2000, max: 5000, median: 3200 };
    expect(priceSimilarity(makeProduct({ price: 3200 }), profile({ priceBand: band }))).toBeCloseTo(1);
    expect(priceSimilarity(makeProduct({ price: 9600 }), profile({ priceBand: band }))).toBeCloseTo(0);
    const near = priceSimilarity(makeProduct({ price: 3500 }), profile({ priceBand: band }));
    const far = priceSimilarity(makeProduct({ price: 6000 }), profile({ priceBand: band }));
    expect(near).toBeGreaterThan(far);
    expect(priceSimilarity(makeProduct({ price: 3200 }), profile({ priceBand: null }))).toBe(0);
  });

  it("tagOverlap averages tag affinity", () => {
    const p = makeProduct({ tags: ["running", "footwear"] });
    expect(tagOverlap(p, profile({ tagAffinity: { running: 1 } }))).toBe(0.5);
    expect(tagOverlap(makeProduct({ tags: [] }), profile({ tagAffinity: { running: 1 } }))).toBe(0);
  });

  it("normalizedRating damps products with few reviews", () => {
    expect(normalizedRating(makeProduct({ rating: 5, reviewCount: 10 }))).toBeCloseTo(1);
    expect(normalizedRating(makeProduct({ rating: 5, reviewCount: 0 }))).toBeLessThan(1);
    expect(normalizedRating(makeProduct({ rating: 0 }))).toBe(0);
  });

  it("productSimilarity = 50% category + 50% tag Jaccard", () => {
    const a = makeProduct({ category: "x", tags: ["a", "b"] });
    expect(productSimilarity(a, makeProduct({ category: "x", tags: ["a", "b"] }))).toBeCloseTo(1);
    expect(productSimilarity(a, makeProduct({ category: "y", tags: ["a"] }))).toBeCloseTo(0.25);
    expect(productSimilarity(a, a)).toBe(0);
  });

  it("relation components use the closest seed", () => {
    const shoe = makeProduct({ category: "shoes", tags: ["running"] });
    const candidate = makeProduct({ category: "shoes", tags: ["running"] });
    expect(recentlyViewedRelation(candidate, [shoe])).toBeCloseTo(1);
    expect(recentlyViewedRelation(candidate, [makeProduct({ category: "other", tags: [] }), shoe])).toBeCloseTo(0.9); // older view decays
    expect(wishlistRelation(candidate, [])).toBe(0);
  });

  it("cartRelation uses co-occurrence when stronger than similarity", () => {
    const phone = makeProduct({ id: 1, category: "smartphones", tags: ["phone"] });
    const case_ = makeProduct({ id: 2, category: "mobile-accessories", tags: ["case"] });
    expect(cartRelation(case_, [phone], {})).toBe(0);
    expect(cartRelation(case_, [phone], { [pairKey(1, 2)]: 10 })).toBe(1);
  });
});

describe("PRD §6.2 worked example", () => {
  it("a running backpack scores highly after viewing running shoes", () => {
    const shoes = makeProduct({ id: 1, title: "Running Shoes", category: "footwear", tags: ["footwear", "running"], price: 3200, rating: 4.4 });
    const backpack = makeProduct({ id: 2, title: "Running Backpack", category: "bags", tags: ["running", "bags"], price: 3000, rating: 4.3 });
    const sofa = makeProduct({ id: 3, title: "Sofa", category: "furniture", tags: ["furniture"], price: 45000, rating: 4.3 });
    const catalog = [shoes, backpack, sofa];
    const p = buildSignalProfile({ catalog, signals: { recentlyViewed: [{ productId: 1, at: 1 }], searchHistory: [], wishlist: [], cart: [], purchases: [] }, coOccurrence: {}, popularity: {}, now: 0 });
    const input = { profile: p, viewed: [shoes], wishlist: [], cart: [] };
    const b = scoreBreakdown(backpack, input);
    expect(b.tagOverlap).toBeGreaterThan(0);
    expect(b.priceSimilarity).toBeGreaterThan(0.9);
    expect(compositeScore(b)).toBeGreaterThan(compositeScore(scoreBreakdown(sofa, input)));
  });
});

describe("buildSignalProfile", () => {
  const a = makeProduct({ id: 10, category: "laptops", brand: "Apple", tags: ["laptops", "apple"], price: 100000 });
  const b = makeProduct({ id: 11, category: "smartphones", brand: "Apple", tags: ["smartphones", "apple"], price: 60000 });
  const c = makeProduct({ id: 12, category: "fragrances", brand: "Dior", tags: ["perfumes"], price: 8000 });
  const ctx = (signals: Partial<Parameters<typeof buildSignalProfile>[0]["signals"]>) => ({ catalog: [a, b, c], signals: { recentlyViewed: [], searchHistory: [], wishlist: [], cart: [], purchases: [], ...signals }, coOccurrence: {}, popularity: {}, now: 0 });

  it("has zero confidence with no signals (edge case 24)", () => {
    const p = buildSignalProfile(ctx({}));
    expect(p.confidence).toBe(0);
    expect(p.priceBand).toBeNull();
  });

  it("gives low confidence for a single view (edge case 25)", () => {
    expect(buildSignalProfile(ctx({ recentlyViewed: [{ productId: 12, at: 1 }] })).confidence).toBeLessThan(0.5);
  });

  it("weights cart > wishlist > view and normalizes to 1", () => {
    const p = buildSignalProfile(ctx({ recentlyViewed: [{ productId: 12, at: 1 }], wishlist: [11], cart: [10] }));
    expect(p.categoryAffinity.laptops).toBe(1);
    expect(p.categoryAffinity.smartphones).toBeLessThan(1);
    expect(p.categoryAffinity.fragrances).toBeLessThan(p.categoryAffinity.smartphones);
    expect(p.brandAffinity.Apple).toBe(1);
  });

  it("derives a price band from engaged products", () => {
    const p = buildSignalProfile(ctx({ recentlyViewed: [{ productId: 10, at: 2 }, { productId: 11, at: 1 }] }));
    expect(p.priceBand!.min).toBeLessThan(60000);
    expect(p.priceBand!.max).toBeGreaterThan(100000);
  });

  it("infers categories from search history", () => {
    const p = buildSignalProfile(ctx({ searchHistory: ["laptops"] }));
    expect(p.categoryAffinity.laptops).toBe(1);
  });

  it("seedProfile centres on the seed product", () => {
    const p = seedProfile(c);
    expect(p.categoryAffinity).toEqual({ fragrances: 1 });
    expect(p.priceBand!.median).toBe(8000);
  });
});
