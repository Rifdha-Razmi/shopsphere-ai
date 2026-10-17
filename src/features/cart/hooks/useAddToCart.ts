"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Product } from "@/types";
import { useCartStore } from "@/store/cart.store";
import { useAnalyticsStore } from "@/store/analytics.store";
import { useCanShop } from "@/features/auth/hooks/useCanShop";

/** Adds to cart with stock clamping, user feedback and recommendation-conversion attribution. */
export function useAddToCart() {
  const add = useCartStore((s) => s.add);
  const recordAddToCart = useAnalyticsStore((s) => s.recordAddToCart);
  const router = useRouter();
  const canShop = useCanShop();

  return useCallback(
    (product: Product, variantId: string | null, quantity = 1, opts: { silent?: boolean } = {}) => {
      if (!canShop()) return { ok: false, quantity: 0, clamped: false, message: "Admins can't shop" };
      const result = add(product, variantId, quantity);
      if (!result.ok) {
        toast.error(result.message);
        return result;
      }
      recordAddToCart(product.id);
      if (!opts.silent) {
        if (result.clamped) toast.warning(result.message);
        else toast.success(result.message, { description: product.title, action: { label: "View cart", onClick: () => router.push("/cart") } });
      }
      return result;
    },
    [add, recordAddToCart, router, canShop],
  );
}
