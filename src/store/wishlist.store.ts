import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product, ProductId } from "@/types";

export interface WishlistItem {
  productId: ProductId;
  addedAt: number;
  /** Last-known details, shown if the product later disappears from the API. */
  snapshot: { title: string; thumbnail: string; price: number };
}

interface WishlistState {
  items: WishlistItem[];
  accountLists: Record<string, WishlistItem[]>;
  ownerId: string | null;
  toggle: (product: Product) => boolean;
  remove: (productId: ProductId) => void;
  has: (productId: ProductId) => boolean;
  switchOwner: (userId: string | null) => void;
  /** Guest wishlists are session-only (PRD §4.3) — cleared when a new browser session starts. */
  clearGuestIfNewSession: () => void;
}

const GUEST_SESSION_FLAG = "ss-guest-session";

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      accountLists: {},
      ownerId: null,

      toggle: (product) => {
        const exists = get().items.some((i) => i.productId === product.id);
        if (exists) set({ items: get().items.filter((i) => i.productId !== product.id) });
        else set({ items: [{ productId: product.id, addedAt: Date.now(), snapshot: { title: product.title, thumbnail: product.thumbnail, price: product.price } }, ...get().items] });
        return !exists;
      },

      remove: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),

      has: (productId) => get().items.some((i) => i.productId === productId),

      switchOwner: (userId) => {
        const { ownerId, items, accountLists } = get();
        if (ownerId === userId) return;
        const lists = { ...accountLists };
        if (ownerId) lists[ownerId] = items;
        if (userId) {
          const account = lists[userId] ?? [];
          const merged = ownerId ? account : [...items.filter((i) => !account.some((a) => a.productId === i.productId)), ...account];
          delete lists[userId];
          set({ items: merged, ownerId: userId, accountLists: lists });
        } else {
          set({ items: [], ownerId: null, accountLists: lists });
        }
      },

      clearGuestIfNewSession: () => {
        try {
          if (!sessionStorage.getItem(GUEST_SESSION_FLAG)) {
            sessionStorage.setItem(GUEST_SESSION_FLAG, "1");
            if (!get().ownerId) set({ items: [] });
          }
        } catch {
          /* sessionStorage unavailable — keep the list */
        }
      },
    }),
    { name: "ss-wishlist", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
