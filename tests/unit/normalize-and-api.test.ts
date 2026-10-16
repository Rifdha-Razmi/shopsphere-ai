import { afterEach, describe, expect, it, vi } from "vitest";
import { buildVariants, normalizeProduct, stockFor } from "@/services/catalog/normalize";
import { productListResponseSchema, rawProductSchema } from "@/services/api/schemas";
import { ApiError, request, toUserMessage } from "@/services/api/http";
import { applyOverrides, EMPTY_OVERRIDES } from "@/services/catalog/overrides";
import { snapshotCatalog } from "../helpers/catalog";
import { makeProduct } from "../helpers/factories";

describe("normalizeProduct", () => {
  it("converts USD to INR and applies the discount", () => {
    const p = normalizeProduct(rawProductSchema.parse({ id: 1, title: "T", price: 100, discountPercentage: 10 }));
    expect(p.mrp).toBe(8299);
    expect(p.price).toBeLessThan(p.mrp);
    expect(p.discountPercentage).toBeGreaterThan(0);
  });
  it("survives malformed fields with safe defaults (edge case 21)", () => {
    const p = normalizeProduct(rawProductSchema.parse({ id: 7, title: "Odd", price: "abc", tags: "nope", images: null, rating: 99 }));
    expect(p).toMatchObject({ price: expect.any(Number), tags: [], images: [], rating: 5, brand: "Generic" });
  });
  it("drops list items without id/title instead of crashing", () => {
    const res = productListResponseSchema.parse({ products: [{ id: 1, title: "ok" }, { title: "no id" }, null, "x"], total: 4 });
    expect(res.products).toHaveLength(1);
  });
  it("snapshot catalogue normalizes completely", () => {
    expect(snapshotCatalog.length).toBe(194);
  });
});

describe("variants", () => {
  it("are deterministic and sum to product stock", () => {
    const a = buildVariants(88, "mens-shoes", 47);
    expect(buildVariants(88, "mens-shoes", 47)).toEqual(a);
    expect(a.reduce((s, v) => s + v.stock, 0)).toBe(47);
    expect(a.map((v) => v.attributes.size)).toEqual(["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"]);
  });
  it("some products intentionally have an out-of-stock variant", () => {
    const withZero = snapshotCatalog.filter((p) => p.stock > 0 && p.variants.some((v) => v.stock === 0));
    expect(withZero.length).toBeGreaterThan(5);
  });
  it("stockFor reads variant or product stock", () => {
    const p = makeProduct({ stock: 9, variants: [{ id: "a", attributes: {}, stock: 4 }] });
    expect(stockFor(p, "a")).toBe(4);
    expect(stockFor(p, null)).toBe(9);
    expect(stockFor(p, "missing")).toBe(0);
  });
});

describe("applyOverrides", () => {
  it("applies admin edits, creations, deletions and archives", () => {
    const base = [makeProduct({ id: 1, price: 100, mrp: 100 }), makeProduct({ id: 2 }), makeProduct({ id: 3 })];
    const local = makeProduct({ id: 100001, isLocal: true });
    const out = applyOverrides(base, { ...EMPTY_OVERRIDES, edits: { 1: { price: 80 } }, deleted: [2], archived: [3], created: [local] });
    expect(out.map((p) => p.id)).toEqual([1, 3, 100001]);
    expect(out[0]).toMatchObject({ price: 80, discountPercentage: 20 });
    expect(out[1].archived).toBe(true);
  });
});

describe("http client", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("maps network failures and HTTP errors to safe user messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(request("https://x.test/a", { schema: rawProductSchema })).rejects.toMatchObject({ kind: "network" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    await expect(request("https://x.test/a", { schema: rawProductSchema })).rejects.toMatchObject({ kind: "not-found" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 200 })));
    await expect(request("https://x.test/a", { schema: rawProductSchema })).rejects.toMatchObject({ kind: "parse" });
    expect(toUserMessage(new ApiError("http", "secret stack details"))).not.toMatch(/secret/);
  });
});
