import type { Order, Product, Review, ReviewSort } from "@/types";
import fixture from "@/mocks/reviews.json";
import { hasPurchased } from "@/services/orders/orders.service";

interface FixtureReview extends Omit<Review, "createdAt" | "source"> {
  daysAgo: number;
}

export function loadFixtureReviews(now = Date.now()): Review[] {
  return (fixture.reviews as unknown as FixtureReview[]).map(({ daysAgo, ...r }) => ({
    ...r,
    createdAt: new Date(now - daysAgo * 86_400_000).toISOString(),
    source: "fixture" as const,
  }));
}

/** DummyJSON ships 3 short reviews per product — adapt them to the Review shape. */
export function sourceReviews(product: Product): Review[] {
  return product.sourceReviews.map((r, i) => ({
    id: `dj_${product.id}_${i}`,
    productId: product.id,
    userId: null,
    authorName: r.reviewerName,
    rating: Math.max(1, Math.min(5, Math.round(r.rating))),
    title: r.rating >= 4 ? "Recommended" : r.rating >= 3 ? "Okay" : "Not great",
    body: r.comment,
    createdAt: r.date,
    helpful: 0,
    notHelpful: 0,
    verifiedPurchase: false,
    source: "dummyjson" as const,
  }));
}

/**
 * Verified purchase (PRD §5.10): for locally submitted reviews this is derived
 * from the reviewer's local order history — not from a payment provider.
 */
export function isVerified(review: Review, orders: Order[]): boolean {
  if (review.source !== "local") return review.verifiedPurchase;
  return !!review.userId && hasPurchased(orders, review.userId, review.productId);
}

export function sortReviews(reviews: Review[], sort: ReviewSort): Review[] {
  const list = [...reviews];
  switch (sort) {
    case "highest":
      return list.sort((a, b) => b.rating - a.rating || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case "lowest":
      return list.sort((a, b) => a.rating - b.rating || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case "helpful":
      return list.sort((a, b) => b.helpful - b.notHelpful - (a.helpful - a.notHelpful) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case "recent":
    default:
      return list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
}

export interface RatingSummary {
  average: number;
  count: number;
  distribution: { stars: number; count: number; share: number }[];
}

export function summarizeRatings(reviews: Review[]): RatingSummary {
  const counts = [0, 0, 0, 0, 0];
  for (const r of reviews) counts[Math.max(1, Math.min(5, Math.round(r.rating))) - 1]++;
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  return {
    average: Math.round(average * 10) / 10,
    count,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: counts[stars - 1], share: count ? counts[stars - 1] / count : 0 })),
  };
}
