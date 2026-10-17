import { describe, expect, it } from "vitest";
import { computeFacets, filterProducts, paginate, sanitizeFilters, sortProducts } from "@/services/catalog/filter";
import { EMPTY_FILTERS } from "@/types";
import { countActiveFilters, parseDiscoveryParams, toDiscoveryParams } from "@/lib/url-filters";
import { makeProduct } from "../helpers/factories";

const shoes = [
  makeProduct({ id: 1, category: "footwear", price: 1500, rating: 4.5, title: "Trail Runner" }),
  makeProduct({ id: 2, category: "footwear", price: 2500, rating: 4.1, title: "Road Runner", discountPercentage: 0, mrp: 2500 }),
  makeProduct({ id: 3, category: "footwear", price: 4800, rating: 4.6, title: "Racer", stock: 0 }),
  makeProduct({ id: 4, category: "footwear", price: 3900, rating: 3.2, title: "Casual" }),
  makeProduct({ id: 5, category: "bags", price: 3000, rating: 4.9, title: "Backpack", brand: "Other" }),
];

describe("filterProducts", () => {
  it("MOD-02-001: footwear ₹2,000–₹5,000, rating ≥ 4, sorted price low→high", () => {
    const result = sortProducts(filterProducts(shoes, { ...EMPTY_FILTERS, categories: ["footwear"], minPrice: 2000, maxPrice: 5000, minRating: 4 }), "price-asc");
    expect(result.map((p) => p.id)).toEqual([2, 3]);
  });
  it("availability, on-sale and brand filters", () => {
    expect(filterProducts(shoes, { ...EMPTY_FILTERS, availability: "in-stock" }).map((p) => p.id)).not.toContain(3);
    expect(filterProducts(shoes, { ...EMPTY_FILTERS, availability: "out-of-stock" }).map((p) => p.id)).toEqual([3]);
    expect(filterProducts(shoes, { ...EMPTY_FILTERS, onSale: true }).map((p) => p.id)).not.toContain(2);
    expect(filterProducts(shoes, { ...EMPTY_FILTERS, brands: ["Other"] }).map((p) => p.id)).toEqual([5]);
  });
  it("MOD-02-002: impossible combinations return an empty list (not an error)", () => {
    expect(filterProducts(shoes, { ...EMPTY_FILTERS, categories: ["bags"], minRating: 5 })).toEqual([]);
  });
  it("hides archived products", () => {
    expect(filterProducts([makeProduct({ archived: true })], EMPTY_FILTERS)).toEqual([]);
  });
  it("keyword query matches title words", () => {
    expect(filterProducts(shoes, { ...EMPTY_FILTERS, query: "runner" }).map((p) => p.id)).toEqual([1, 2]);
  });
});

describe("sanitizeFilters (edge case 7)", () => {
  it("swaps an inverted price range and drops negatives", () => {
    expect(sanitizeFilters({ ...EMPTY_FILTERS, minPrice: 5000, maxPrice: 2000 })).toMatchObject({ minPrice: 2000, maxPrice: 5000 });
    expect(sanitizeFilters({ ...EMPTY_FILTERS, minPrice: -5 }).minPrice).toBeNull();
  });
});

describe("sorting, pagination, facets", () => {
  it("sorts by rating and price", () => {
    expect(sortProducts(shoes, "rating")[0].id).toBe(5);
    expect(sortProducts(shoes, "price-desc")[0].id).toBe(3);
  });
  it("paginates and clamps out-of-range pages", () => {
    const r = paginate([1, 2, 3, 4, 5], 9, 2);
    expect(r).toEqual({ items: [5], page: 3, totalPages: 3 });
  });
  it("computes facet counts and price range", () => {
    const f = computeFacets(shoes);
    expect(f.categories[0]).toEqual({ value: "footwear", count: 4 });
    expect(f.priceRange).toEqual([1500, 4800]);
  });
});

describe("URL state", () => {
  it("round-trips discovery state through query params", () => {
    const state = { filters: { ...EMPTY_FILTERS, categories: ["footwear"], brands: ["Nike"], minPrice: 2000, maxPrice: 5000, minRating: 4, onSale: true }, sort: "price-asc" as const, page: 2 };
    const params = toDiscoveryParams(state);
    expect(params.toString()).toBe("cat=footwear&brand=Nike&min=2000&max=5000&rating=4&sale=1&sort=price-asc&page=2");
    expect(parseDiscoveryParams(params)).toEqual(state);
  });
  it("ignores garbage params safely", () => {
    const s = parseDiscoveryParams(new URLSearchParams("sort=bogus&rating=99&min=abc&page=-3&avail=nope"));
    expect(s).toMatchObject({ sort: "relevance", page: 1, filters: { minRating: null, minPrice: null, availability: "all" } });
  });
  it("counts active filters", () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, brands: ["a", "b"], minPrice: 1, onSale: true })).toBe(4);
  });
});
