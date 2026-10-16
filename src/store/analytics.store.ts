import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductId, RecommendationStrategy } from "@/types";
import { emptyCounters, type AnalyticsCounters } from "@/services/analytics/analytics.service";

/**
 * Local recommendation analytics (PRD §8.4). Impressions, clicks and
 * click-attributed add-to-carts are counted in this browser only.
 */
interface AnalyticsState {
  counters: AnalyticsCounters;
  /** productId -> strategy of the last recommendation click (for conversion attribution). */
  attribution: Record<string, RecommendationStrategy>;
  recordImpression: (strategy: RecommendationStrategy, count?: number) => void;
  recordClick: (strategy: RecommendationStrategy, productId: ProductId) => void;
  recordAddToCart: (productId: ProductId) => void;
  reset: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      counters: emptyCounters(),
      attribution: {},

      recordImpression: (strategy, count = 1) => {
        const c = get().counters;
        set({ counters: { ...c, [strategy]: { ...c[strategy], impressions: c[strategy].impressions + count } } });
      },

      recordClick: (strategy, productId) => {
        const c = get().counters;
        set({ counters: { ...c, [strategy]: { ...c[strategy], clicks: c[strategy].clicks + 1 } }, attribution: { ...get().attribution, [productId]: strategy } });
      },

      recordAddToCart: (productId) => {
        const strategy = get().attribution[productId];
        if (!strategy) return;
        const c = get().counters;
        const { [productId]: _used, ...rest } = get().attribution;
        set({ counters: { ...c, [strategy]: { ...c[strategy], addToCart: c[strategy].addToCart + 1 } }, attribution: rest });
      },

      reset: () => set({ counters: emptyCounters(), attribution: {} }),
    }),
    { name: "ss-analytics", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
