import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Order, OrderStatus } from "@/types";
import { advanceOrder, autoProgress, loadFixtureOrders } from "@/services/orders/orders.service";

interface OrdersState {
  orders: Order[];
  seeded: boolean;
  /** When false, local orders only move when an admin advances them. */
  autoProgress: boolean;
  seedIfNeeded: () => void;
  place: (order: Order) => void;
  advance: (orderId: string) => void;
  setStatus: (orderId: string, status: OrderStatus) => void;
  tick: (now?: number) => void;
  setAutoProgress: (value: boolean) => void;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      seeded: false,
      autoProgress: true,

      seedIfNeeded: () => {
        if (get().seeded) return;
        set({ orders: [...loadFixtureOrders(), ...get().orders], seeded: true });
      },

      place: (order) => set({ orders: [order, ...get().orders.filter((o) => o.id !== order.id)] }),

      advance: (orderId) => set({ orders: get().orders.map((o) => (o.id === orderId ? advanceOrder(o) : o)) }),

      setStatus: (orderId, status) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId) return o;
            let next = o;
            while (next.status !== status && next.status !== "delivered") next = advanceOrder(next);
            return next;
          }),
        }),

      tick: (now = Date.now()) => {
        if (!get().autoProgress) return;
        let changed = false;
        const orders = get().orders.map((o) => {
          const next = autoProgress(o, now);
          if (next !== o) changed = true;
          return next;
        });
        if (changed) set({ orders });
      },

      setAutoProgress: (value) => set({ autoProgress: value }),
    }),
    { name: "ss-orders", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
