import { describe, expect, it } from "vitest";
import { calculateTotals, clampQuantity, couponDiscount, detectIssue, lineKey, mergeCartItems, validateCoupon } from "@/services/cart/cart.service";
import { COUPONS } from "@/lib/constants";
import type { CartItem } from "@/types";
import { makeProduct } from "../helpers/factories";

const item = (o: Partial<CartItem> = {}): CartItem => ({
  key: "1:default", productId: 1, variantId: null, variantLabel: null, quantity: 1, unitPrice: 1000, addedAt: 1,
  snapshot: { title: "x", thumbnail: "", brand: "b", category: "c", stock: 5, mrp: 1200 }, ...o,
});

describe("clampQuantity", () => {
  it("MOD-05-001: clamps 5 to 3 when 3 are in stock", () => {
    expect(clampQuantity(5, 3)).toEqual({ quantity: 3, clamped: true });
  });
  it("never goes below 1 or accepts NaN", () => {
    expect(clampQuantity(0, 3)).toEqual({ quantity: 1, clamped: true });
    expect(clampQuantity(Number.NaN, 3).quantity).toBe(1);
  });
  it("returns 0 when nothing is available", () => {
    expect(clampQuantity(2, 0)).toEqual({ quantity: 0, clamped: true });
  });
});

describe("coupons", () => {
  it("accepts a valid code (case-insensitive)", () => {
    expect(validateCoupon(" welcome10 ", 2000)).toMatchObject({ ok: true });
  });
  it("rejects unknown, expired and below-minimum codes with a reason (edge case 11)", () => {
    expect(validateCoupon("NOPE", 5000)).toMatchObject({ ok: false, reason: "not-found" });
    expect(validateCoupon("DIWALI2024", 5000)).toMatchObject({ ok: false, reason: "expired" });
    const r = validateCoupon("FLAT500", 1000);
    expect(r).toMatchObject({ ok: false, reason: "min-subtotal" });
    if (!r.ok) expect(r.message).toMatch(/Add ₹3,999 more/);
  });
  it("caps percent discounts", () => {
    const welcome = COUPONS.find((c) => c.code === "WELCOME10")!;
    expect(couponDiscount(welcome, 2000)).toBe(200);
    expect(couponDiscount(welcome, 100000)).toBe(1500);
  });
});

describe("calculateTotals", () => {
  it("computes subtotal, savings, shipping, tax and total", () => {
    const t = calculateTotals([{ quantity: 2, unitPrice: 300, mrp: 400 }], null);
    expect(t).toMatchObject({ itemCount: 2, subtotal: 600, mrpTotal: 800, productSavings: 200, shipping: 79, tax: 108, total: 787 });
  });
  it("free shipping above ₹999 or with FREESHIP", () => {
    expect(calculateTotals([{ quantity: 1, unitPrice: 1000, mrp: 1000 }], null).shipping).toBe(0);
    expect(calculateTotals([{ quantity: 1, unitPrice: 100, mrp: 100 }], COUPONS.find((c) => c.code === "FREESHIP")!).shipping).toBe(0);
  });
  it("adds delivery method cost and an empty cart costs nothing", () => {
    expect(calculateTotals([{ quantity: 1, unitPrice: 2000, mrp: 2000 }], null, 149).shipping).toBe(149);
    expect(calculateTotals([], null, 149).total).toBe(0);
  });
});

describe("detectIssue (PRD §5.5)", () => {
  it("flags unavailable, out of stock, insufficient stock and price changes", () => {
    expect(detectIssue(item(), undefined)).toEqual({ type: "unavailable" });
    expect(detectIssue(item(), makeProduct({ id: 1, archived: true }))).toEqual({ type: "unavailable" });
    expect(detectIssue(item(), makeProduct({ id: 1, stock: 0 }))).toEqual({ type: "out-of-stock" });
    expect(detectIssue(item({ quantity: 5 }), makeProduct({ id: 1, stock: 3, price: 1000 }))).toEqual({ type: "insufficient-stock", available: 3 });
    expect(detectIssue(item(), makeProduct({ id: 1, price: 1200 }))).toEqual({ type: "price-changed", oldPrice: 1000, newPrice: 1200 });
    expect(detectIssue(item(), makeProduct({ id: 1, price: 1000 }))).toBeNull();
  });
  it("uses variant stock when a variant is selected", () => {
    const p = makeProduct({ id: 1, price: 1000, stock: 10, variants: [{ id: "m", attributes: { size: "M" }, stock: 0 }, { id: "l", attributes: { size: "L" }, stock: 10 }] });
    expect(detectIssue(item({ variantId: "m", key: lineKey(1, "m") }), p)).toEqual({ type: "out-of-stock" });
    expect(detectIssue(item({ variantId: "l", key: lineKey(1, "l") }), p)).toBeNull();
  });
});

describe("mergeCartItems", () => {
  it("combines duplicate lines instead of duplicating rows (edge cases 8 & 26)", () => {
    const merged = mergeCartItems([item({ quantity: 1 })], [item({ quantity: 2 }), item({ key: "2:default", productId: 2 })]);
    expect(merged).toHaveLength(2);
    expect(merged.find((i) => i.key === "1:default")!.quantity).toBe(3);
  });
  it("'latest' mode keeps the newest write", () => {
    const merged = mergeCartItems([item({ quantity: 1, addedAt: 1 })], [item({ quantity: 4, addedAt: 2 })], "latest");
    expect(merged[0].quantity).toBe(4);
  });
});
