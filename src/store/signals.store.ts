import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductId, ViewEvent } from "@/types";
import { MAX_RECENTLY_VIEWED, MAX_SEARCH_HISTORY } from "@/lib/constants";
import { normalizeText } from "@/utils/text";

/** Device-level behavioural signals feeding the recommendation engine (PRD §6.1). */
interface SignalsState {
  recentlyViewed: ViewEvent[];
  searchHistory: string[];
  recordView: (productId: ProductId) => void;
  recordSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearSearchHistory: () => void;
  clearRecentlyViewed: () => void;
  resetSignals: () => void;
}

export const useSignalsStore = create<SignalsState>()(
  persist(
    (set, get) => ({
      recentlyViewed: [],
      searchHistory: [],

      recordView: (productId) => {
        const rest = get().recentlyViewed.filter((v) => v.productId !== productId);
        set({ recentlyViewed: [{ productId, at: Date.now() }, ...rest].slice(0, MAX_RECENTLY_VIEWED) });
      },

      recordSearch: (query) => {
        const q = query.trim().slice(0, 80);
        if (!q) return;
        const rest = get().searchHistory.filter((s) => normalizeText(s) !== normalizeText(q));
        set({ searchHistory: [q, ...rest].slice(0, MAX_SEARCH_HISTORY) });
      },

      removeSearch: (query) => set({ searchHistory: get().searchHistory.filter((s) => s !== query) }),
      clearSearchHistory: () => set({ searchHistory: [] }),
      clearRecentlyViewed: () => set({ recentlyViewed: [] }),
      resetSignals: () => set({ recentlyViewed: [], searchHistory: [] }),
    }),
    { name: "ss-signals", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
