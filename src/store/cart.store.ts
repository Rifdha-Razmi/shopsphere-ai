import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, CouponResult, Product } from "@/types";
import { clampQuantity, lineKey, mergeCartItems, validateCoupon } from "@/services/cart/cart.service";
import { stockFor, variantLabel } from "@/services/catalog/normalize";

interface CartSnapshot {
  items: CartItem[];
  saved: CartItem[];
  couponCode: string | null;
}

export interface AddResult {
  ok: boolean;
  quantity: number;
  clamped: boolean;
  message: string;
}

interface CartState extends CartSnapshot {
  /** Carts of signed-out accounts on this device ("persisted to account"). */
  accountCarts: Record<string, CartSnapshot>;
  ownerId: string | null;
  /** Keys of cart lines the customer has unticked; everything else goes to checkout. New items start ticked. */
  deselected: string[];
  add: (product: Product, variantId: string | null, quantity?: number) => AddResult;
  setQuantity: (key: string, quantity: number, available: number) => { quantity: number; clamped: boolean };
  remove: (key: string) => void;
  saveForLater: (key: string) => void;
  moveToCart: (key: string) => void;
  removeSaved: (key: string) => void;
  /** Customer confirms a changed price (edge case 10). */
  acceptPrice: (key: string, newPrice: number) => void;
  applyCoupon: (code: string, subtotal: number) => CouponResult;
  removeCoupon: () => void;
  clear: () => void;
  /** Tick or untick one line for checkout. */
  setSelected: (key: string, selected: boolean) => void;
  /** Tick or untick every line. */
  setAllSelected: (selected: boolean) => void;
  /** After an order: remove only the lines that were bought; unticked lines stay in the cart. */
  removeOrdered: (keys: string[]) => void;
  /** Called on login/logout to swap between guest and account carts. */
  switchOwner: (userId: string | null) => void;
}

const empty: CartSnapshot = { items: [], saved: [], couponCode: null };

function snapshotOf(product: Product): CartItem["snapshot"] {
  return { title: product.title, thumbnail: product.thumbnail, brand: product.brand, category: product.category, stock: product.stock, mrp: product.mrp };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ...empty,
      accountCarts: {},
      ownerId: null,
      deselected: [],

      add: (product, variantId, quantity = 1) => {
        const available = stockFor(product, variantId);
        if (available <= 0) return { ok: false, quantity: 0, clamped: false, message: "This item is out of stock." };
        const key = lineKey(product.id, variantId);
        const items = get().items;
        const existing = items.find((i) => i.key === key);
        // Edge case 8: duplicates increment the existing line instead of adding a row.
        const requested = (existing?.quantity ?? 0) + quantity;
        const { quantity: q, clamped } = clampQuantity(requested, available);
        if (existing) {
          set({ items: items.map((i) => (i.key === key ? { ...i, quantity: q, snapshot: snapshotOf(product) } : i)) });
        } else {
          const variant = product.variants.find((v) => v.id === variantId) ?? null;
          const line: CartItem = { key, productId: product.id, variantId, variantLabel: variantLabel(variant), quantity: q, unitPrice: product.price, snapshot: snapshotOf(product), addedAt: Date.now() };
          set({ items: [...items, line], saved: get().saved.filter((s) => s.key !== key) });
        }
        return {
          ok: true,
          quantity: q,
          clamped,
          message: clamped ? `Only ${available} in stock — your cart now has the maximum (${q}).` : existing ? `Updated quantity to ${q}.` : "Added to cart.",
        };
      },

      setQuantity: (key, quantity, available) => {
        const result = clampQuantity(quantity, available);
        if (result.quantity <= 0) return result;
        set({ items: get().items.map((i) => (i.key === key ? { ...i, quantity: result.quantity } : i)) });
        return result;
      },

      remove: (key) => set({ items: get().items.filter((i) => i.key !== key), deselected: get().deselected.filter((k) => k !== key) }),

      saveForLater: (key) => {
        const item = get().items.find((i) => i.key === key);
        if (!item) return;
        set({ items: get().items.filter((i) => i.key !== key), saved: [item, ...get().saved.filter((s) => s.key !== key)], deselected: get().deselected.filter((k) => k !== key) });
      },

      moveToCart: (key) => {
        const item = get().saved.find((i) => i.key === key);
        if (!item) return;
        set({ saved: get().saved.filter((s) => s.key !== key), items: mergeCartItems(get().items, [item]) });
      },

      removeSaved: (key) => set({ saved: get().saved.filter((s) => s.key !== key) }),

      acceptPrice: (key, newPrice) => set({ items: get().items.map((i) => (i.key === key ? { ...i, unitPrice: newPrice } : i)) }),

      applyCoupon: (code, subtotal) => {
        const result = validateCoupon(code, subtotal);
        if (result.ok) set({ couponCode: result.coupon.code });
        return result;
      },

      removeCoupon: () => set({ couponCode: null }),

      clear: () => set({ items: [], couponCode: null, deselected: [] }),

      setSelected: (key, selected) => {
        const rest = get().deselected.filter((k) => k !== key);
        set({ deselected: selected ? rest : [...rest, key] });
      },

      setAllSelected: (selected) => set({ deselected: selected ? [] : get().items.map((i) => i.key) }),

      removeOrdered: (keys) => {
        const bought = new Set(keys);
        // The coupon was used on this order; any unticked lines stay for later.
        set({ items: get().items.filter((i) => !bought.has(i.key)), couponCode: null });
      },

      switchOwner: (userId) => {
        const { ownerId, items, saved, couponCode, accountCarts } = get();
        if (ownerId === userId) return;
        const carts = { ...accountCarts };
        if (ownerId) carts[ownerId] = { items, saved, couponCode };
        if (userId) {
          // Logging in: merge the guest cart into the account cart.
          const account = carts[userId] ?? empty;
          const merged = ownerId ? account : { items: mergeCartItems(account.items, items), saved: mergeCartItems(account.saved, saved), couponCode: account.couponCode ?? couponCode };
          delete carts[userId];
          set({ ...merged, ownerId: userId, accountCarts: carts, deselected: [] });
        } else {
          // Logging out: the account cart stays with the account; the device gets an empty guest cart.
          set({ ...empty, ownerId: null, accountCarts: carts, deselected: [] });
        }
      },
    }),
    {
      name: "ss-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
