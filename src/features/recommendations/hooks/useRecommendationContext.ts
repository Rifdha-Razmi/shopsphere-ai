"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { RecommendationContext, RecommendationSignals } from "@/types";
import { buildContext } from "@/services/recommendations/recommendation.service";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useSignalsStore } from "@/store/signals.store";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useOrdersStore } from "@/store/orders.store";
import { useAuthStore } from "@/store/auth.store";

/**
 * Signal assembly for the recommendation service: gathers every client-side
 * signal (PRD §6.1) into one RecommendationContext. Purchases only count for
 * the signed-in customer.
 */
export function useRecommendationContext(): { context: RecommendationContext | null; signals: RecommendationSignals; isLoading: boolean; isError: boolean } {
  const { products, isLoading, isError } = useCatalog();
  const { recentlyViewed, searchHistory } = useSignalsStore(useShallow((s) => ({ recentlyViewed: s.recentlyViewed, searchHistory: s.searchHistory })));
  const cartItems = useCartStore((s) => s.items);
  const wishlistItems = useWishlistStore((s) => s.items);
  const orders = useOrdersStore((s) => s.orders);
  const userId = useAuthStore((s) => s.session?.user.id ?? null);

  const signals = useMemo<RecommendationSignals>(() => {
    const mine = userId ? orders.filter((o) => o.userId === userId) : [];
    return {
      recentlyViewed,
      searchHistory,
      wishlist: wishlistItems.map((w) => w.productId),
      cart: Array.from(new Set(cartItems.map((c) => c.productId))),
      purchases: mine.flatMap((o) => o.lines.map((l) => ({ productId: l.productId, at: Date.parse(o.createdAt) }))),
    };
  }, [recentlyViewed, searchHistory, wishlistItems, cartItems, orders, userId]);

  const context = useMemo(() => (products.length ? buildContext({ catalog: products, signals, orders }) : null), [products, signals, orders]);

  return { context, signals, isLoading, isError };
}
