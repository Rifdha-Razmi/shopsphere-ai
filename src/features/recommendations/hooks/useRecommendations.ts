"use client";

import { useQuery } from "@tanstack/react-query";
import type { RecommendationRequest, RecommendationResult } from "@/types";
import { getRecommendations, type ServiceOptions } from "@/services/recommendations/recommendation.service";
import { queryKeys } from "@/lib/query-keys";
import { useHydrated } from "@/store/hydration.store";
import { useRecommendationContext } from "./useRecommendationContext";

/**
 * The only way UI components obtain recommendations (PRD §6.4):
 *   component → useRecommendations() → Recommendation Service → Provider → Mock Engine
 */
export function useRecommendations(request: RecommendationRequest, options: ServiceOptions = {}, enabled = true) {
  const hydrated = useHydrated();
  const { context, signals, isLoading: catalogLoading, isError: catalogError } = useRecommendationContext();

  const query = useQuery<RecommendationResult>({
    queryKey: queryKeys.recommendations([
      request,
      options.fallback ?? "none",
      signals.recentlyViewed.map((v) => v.productId),
      signals.wishlist,
      signals.cart,
      signals.purchases.length,
      signals.searchHistory,
      context?.catalog.length ?? 0,
      context?.catalog.reduce((h, p) => (h * 31 + p.stock + Math.round(p.price)) % 1_000_000_007, 7) ?? 0,
    ]),
    queryFn: () => getRecommendations(request, context!, options),
    enabled: enabled && hydrated && !!context,
    staleTime: 30_000,
  });

  return {
    result: query.data ?? null,
    isLoading: !hydrated || catalogLoading || (!!context && query.isPending),
    isError: catalogError || query.isError,
  };
}
