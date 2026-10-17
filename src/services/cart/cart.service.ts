import type { CartIssue, CartItem, CartTotals, Coupon, CouponResult, Product, ProductId } from "@/types";
import { COUPONS, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE, TAX_RATE } from "@/lib/constants";
import { stockFor } from "@/services/catalog/normalize";
import { clamp } from "@/utils/math";

/** Pure cart business logic — no React, no storage. */

export function lineKey(productId: ProductId, variantId: string | null): string {
  return `${productId}:${variantId ?? "default"}`;
}

/** Clamps a requested quantity to [1, available]. Returns the clamped value and whether it changed. */
export function clampQuantity(requested: number, available: number): { quantity: number; clamped: boolean } {
  const safeRequested = Number.isFinite(requested) ? Math.floor(requested) : 1;
  if (available <= 0) return { quantity: 0, clamped: safeRequested > 0 };
  const quantity = clamp(safeRequested, 1, available);
  return { quantity, clamped: quantity !== safeRequested };
}

export function validateCoupon(code: string, subtotal: number, now = new Date()): CouponResult {
  const normalized = code.trim().toUpperCase();
  const coupon = COUPONS.find((c) => c.code === normalized);
  if (!coupon) return { ok: false, reason: "not-found", message: `"${normalized || code}" isn't a valid coupon code.` };
  if (new Date(`${coupon.expiresAt}T23:59:59`) < now) {
    return { ok: false, reason: "expired", message: `${coupon.code} expired on ${new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.` };
  }
  if (subtotal < coupon.minSubtotal) {
    return { ok: false, reason: "min-subtotal", message: `${coupon.code} needs a minimum order of ₹${coupon.minSubtotal.toLocaleString("en-IN")}. Add ₹${Math.ceil(coupon.minSubtotal - subtotal).toLocaleString("en-IN")} more to use it.` };
  }
  return { ok: true, coupon };
}

export function couponDiscount(coupon: Coupon | null, subtotal: number): number {
  if (!coupon || subtotal < coupon.minSubtotal) return 0;
  if (coupon.kind === "percent") {
    const raw = (subtotal * coupon.value) / 100;
    return Math.round(Math.min(raw, coupon.maxDiscount ?? raw));
  }
  if (coupon.kind === "flat") return Math.min(coupon.value, subtotal);
  return 0;
}

export function shippingFor(subtotalAfterDiscount: number, coupon: Coupon | null, itemCount: number, deliveryCost = 0): number {
  if (itemCount === 0) return 0;
  const base = coupon?.kind === "free-shipping" || subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  return base + deliveryCost;
}

export interface PricedLine {
  quantity: number;
  unitPrice: number;
  mrp: number;
}

export function calculateTotals(lines: PricedLine[], coupon: Coupon | null, deliveryCost = 0): CartTotals {
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const mrpTotal = lines.reduce((sum, l) => sum + Math.max(l.mrp, l.unitPrice) * l.quantity, 0);
  const discount = couponDiscount(coupon, subtotal);
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = shippingFor(afterDiscount, coupon, itemCount, deliveryCost);
  const tax = Math.round(afterDiscount * TAX_RATE);
  return {
    itemCount,
    subtotal,
    mrpTotal,
    productSavings: mrpTotal - subtotal,
    couponDiscount: discount,
    shipping,
    tax,
    total: afterDiscount + shipping + tax,
  };
}

/**
 * Compares a cart line against the live catalogue (PRD §5.5 failure handling).
 * Returns `null` when the line is fine.
 */
export function detectIssue(item: CartItem, product: Product | undefined): CartIssue | null {
  if (!product || product.archived) return { type: "unavailable" };
  const available = stockFor(product, item.variantId);
  if (available <= 0) return { type: "out-of-stock" };
  if (item.quantity > available) return { type: "insufficient-stock", available };
  if (product.price !== item.unitPrice) return { type: "price-changed", oldPrice: item.unitPrice, newPrice: product.price };
  return null;
}

export function issueBlocksCheckout(issue: CartIssue | null): boolean {
  return issue !== null;
}

/**
 * Merges two carts (guest → account on login, or cross-tab writes — edge case
 * 26). Lines with the same key are combined, never duplicated; the most
 * recent write wins for quantity.
 */
export function mergeCartItems(base: CartItem[], incoming: CartItem[], mode: "sum" | "latest" = "sum"): CartItem[] {
  const map = new Map(base.map((i) => [i.key, { ...i }]));
  for (const item of incoming) {
    const existing = map.get(item.key);
    if (!existing) map.set(item.key, { ...item });
    else if (mode === "sum") map.set(item.key, { ...existing, quantity: existing.quantity + item.quantity });
    else if (item.addedAt >= existing.addedAt) map.set(item.key, { ...item });
  }
  return [...map.values()];
}
