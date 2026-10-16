import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductId } from "@/types";
import { MAX_COMPARE } from "@/lib/constants";

interface UiState {
  assistantOpen: boolean;
  quickViewId: ProductId | null;
  compareIds: ProductId[];
  setAssistantOpen: (open: boolean) => void;
  openQuickView: (id: ProductId) => void;
  closeQuickView: () => void;
  toggleCompare: (id: ProductId) => { ok: boolean; message: string };
  removeCompare: (id: ProductId) => void;
  clearCompare: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      assistantOpen: false,
      quickViewId: null,
      compareIds: [],
      setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
      openQuickView: (quickViewId) => set({ quickViewId }),
      closeQuickView: () => set({ quickViewId: null }),
      toggleCompare: (id) => {
        const ids = get().compareIds;
        if (ids.includes(id)) {
          set({ compareIds: ids.filter((i) => i !== id) });
          return { ok: true, message: "Removed from comparison." };
        }
        if (ids.length >= MAX_COMPARE) return { ok: false, message: `You can compare up to ${MAX_COMPARE} products. Remove one first.` };
        set({ compareIds: [...ids, id] });
        return { ok: true, message: "Added to comparison." };
      },
      removeCompare: (id) => set({ compareIds: get().compareIds.filter((i) => i !== id) }),
      clearCompare: () => set({ compareIds: [] }),
    }),
    {
      name: "ss-ui",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ compareIds: s.compareIds }),
    },
  ),
);
