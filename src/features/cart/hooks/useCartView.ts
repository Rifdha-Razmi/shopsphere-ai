"use client";

import { useMemo } from "react";
import type { CartIssue, CartItem, CartTotals, Coupon, Product } from "@/types";
import { COUPONS } from "@/lib/constants";
import { calculateTotals, detectIssue } from "@/services/cart/cart.service";
import { stockFor } from "@/services/catalog/normalize";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useCartStore } from "@/store/cart.store";

export interface CartLineView {
  item: CartItem;
  product: Product | undefined;
  issue: CartIssue | null;
  available: number;
  /** Price used for totals: live price when known, otherwise the price at add time. */
  price: number;
  /** Ticked for checkout. Totals, issues and the order only include selected lines. */
  selected: boolean;
}

/**
 * Joins cart lines (client state) with the live catalogue (server state) and
 * derives issues, totals and whether checkout is blocked. When the catalogue
 * cannot be loaded, lines fall back to their cached snapshot (PRD §5.5).
 * The customer can untick lines: only selected lines are totalled and checked out.
 */
export function useCartView(deliveryCost = 0) {
  const items = useCartStore((s) => s.items);
  const couponCode = useCartStore((s) => s.couponCode);
  const deselected = useCartStore((s) => s.deselected);
  const catalog = useCatalog();
  const apiAvailable = catalog.hasData;

  return useMemo(() => {
    const unticked = new Set(deselected);
    const lines: CartLineView[] = items.map((item) => {
      const selected = !unticked.has(item.key);
      if (!apiAvailable) return { item, product: undefined, issue: null, available: item.snapshot.stock, price: item.unitPrice, selected };
      const product = catalog.byId.get(item.productId);
      const issue = detectIssue(item, product);
      return { item, product, issue, available: product ? stockFor(product, item.variantId) : 0, price: item.unitPrice, selected };
    });
    const selectedLines = lines.filter((l) => l.selected);

    const coupon: Coupon | null = COUPONS.find((c) => c.code === couponCode) ?? null;
    const priced = selectedLines
      .filter((l) => !l.issue || l.issue.type === "price-changed" || l.issue.type === "insufficient-stock")
      .map((l) => ({ quantity: l.issue?.type === "insufficient-stock" ? l.issue.available : l.item.quantity, unitPrice: l.price, mrp: l.product?.mrp ?? l.item.snapshot.mrp }));
    const totals: CartTotals = calculateTotals(priced, coupon, deliveryCost);
    // Only ticked lines can block checkout — an unticked out-of-stock item is simply left behind.
    const issues = selectedLines.filter((l) => l.issue);

    return {
      lines,
      selectedLines,
      /** Total quantity of everything in the cart (ticked or not), for the page heading. */
      cartCount: items.reduce((n, i) => n + i.quantity, 0),
      allSelected: selectedLines.length === lines.length,
      nothingSelected: lines.length > 0 && selectedLines.length === 0,
      totals,
      coupon,
      issues,
      /** Checkout is blocked until every issue is resolved, and while the API is unavailable. */
      blocked: selectedLines.length === 0 || issues.length > 0 || (!apiAvailable && items.length > 0),
      apiAvailable,
      isLoading: catalog.isLoading,
      isStale: catalog.isStale || (catalog.isError && items.length > 0),
      retry: catalog.refetch,
      isEmpty: items.length === 0,
    };
  }, [items, deselected, couponCode, catalog.byId, catalog.isLoading, catalog.isStale, catalog.isError, catalog.refetch, apiAvailable, deliveryCost]);
}
