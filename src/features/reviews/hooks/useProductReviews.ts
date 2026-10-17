"use client";

import { useMemo } from "react";
import type { Product, Review } from "@/types";
import { isVerified, loadFixtureReviews, sourceReviews, summarizeRatings } from "@/services/reviews/reviews.service";
import { useReviewsStore, withVotes } from "@/store/reviews.store";
import { useOrdersStore } from "@/store/orders.store";

let fixtureCache: Review[] | null = null;
const fixtures = () => (fixtureCache ??= loadFixtureReviews());

/** Every review for a product, before moderation: locally submitted + fixture + DummyJSON. */
export function allReviewsFor(product: Product, local: Review[]): Review[] {
  return [...local.filter((r) => r.productId === product.id), ...fixtures().filter((r) => r.productId === product.id), ...sourceReviews(product)];
}

/** Reviews shown in the store for a product, with local votes applied and admin-hidden ones removed. */
export function useProductReviews(product: Product | undefined) {
  const local = useReviewsStore((s) => s.local);
  const votes = useReviewsStore((s) => s.votes);
  const hidden = useReviewsStore((s) => s.hidden);
  const orders = useOrdersStore((s) => s.orders);

  return useMemo(() => {
    if (!product) return { reviews: [] as Review[], summary: summarizeRatings([]) };
    const all = allReviewsFor(product, local)
      .filter((r) => !hidden.includes(r.id)) // hidden by an admin
      .map((r) => {
        const voted = withVotes(r, votes);
        return { ...voted, verifiedPurchase: isVerified(voted, orders) };
      });
    return { reviews: all, summary: summarizeRatings(all) };
  }, [product, local, votes, orders, hidden]);
}
