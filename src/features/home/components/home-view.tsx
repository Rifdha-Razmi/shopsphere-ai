"use client";

import { useMemo } from "react";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useSignalsStore } from "@/store/signals.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useHydrated } from "@/store/hydration.store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RecommendationRail } from "@/features/recommendations/components/recommendation-rail";
import { ProductRail } from "@/features/products/components/product-rail";
import { StaleDataBanner, ErrorState } from "@/components/common/state-views";
import { truncate } from "@/utils/text";
import { CategoryTiles } from "./category-tiles";
import { Hero } from "./hero";

/**
 * Homepage (MOD-01). First-time visitors see Featured + Trending and a
 * "Popular Right Now" fallback instead of empty personal rails (MOD-01-001);
 * returning visitors get Recently Viewed and signal-driven rails (MOD-01-002).
 */
export function HomeView() {
  const hydrated = useHydrated();
  const { isAuthenticated } = useAuth();
  const { products, byId, isLoading, isError, isStale, refetch } = useCatalog();
  const viewed = useSignalsStore((s) => s.recentlyViewed);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const hasHistory = hydrated && viewed.length > 0;
  const lastViewed = hasHistory ? byId.get(viewed[0].productId) : undefined;

  const featured = useMemo(
    () => products.filter((p) => p.stock > 0 && p.rating >= 4 && p.discountPercentage >= 8 && p.price >= 999).sort((a, b) => b.discountPercentage - a.discountPercentage).slice(0, 12),
    [products],
  );

  return (
    <div className="container-page space-y-10 py-6 sm:py-8">
      <h1 className="sr-only">ShopSphere AI — online shopping</h1>
      {isStale && <StaleDataBanner onRetry={() => void refetch()} />}
      <Hero />
      {isError ? (
        <ErrorState title="We couldn't load products" description="The product catalogue is unavailable right now." onRetry={() => void refetch()} />
      ) : (
        <>
          <CategoryTiles />
          {hasHistory && <RecommendationRail request={{ strategy: "recently-viewed", limit: 12 }} href={isAuthenticated ? "/account/recently-viewed" : undefined} />}
          <RecommendationRail request={{ strategy: "personalized", limit: 12 }} options={{ fallback: "trending" }} />
          {lastViewed && (
            <RecommendationRail
              request={{ strategy: "similar", productId: lastViewed.id, limit: 12, exclude: viewed.map((v) => v.productId) }}
              title={`Because You Viewed ${truncate(lastViewed.title, 32)}`}
            />
          )}
          <ProductRail title="Featured Deals" products={featured} loading={isLoading} href="/products?sale=1" />
          <RecommendationRail request={{ strategy: "trending", limit: 12 }} />
          {hasHistory && <RecommendationRail request={{ strategy: "category", limit: 12 }} />}
          {hasHistory && <RecommendationRail request={{ strategy: "price", limit: 12 }} />}
          {hydrated && wishlistCount > 0 && <RecommendationRail request={{ strategy: "wishlist", limit: 12 }} />}
        </>
      )}
    </div>
  );
}
