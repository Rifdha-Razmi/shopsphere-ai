"use client";

import { useEffect } from "react";
import { PERSISTED_STORES, useOrdersStore, useWishlistStore } from "@/store";
import { useHydrationStore } from "@/store/hydration.store";

/**
 * Rehydrates every persisted Zustand store after mount (avoids SSR hydration
 * mismatches), then keeps tabs in sync: when another tab writes a store, this
 * tab re-reads it — last write wins, no duplicated or lost cart lines
 * (edge case 26).
 */
export function StoreHydrator() {
  const setHydrated = useHydrationStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;
    Promise.all(Object.values(PERSISTED_STORES).map((store) => Promise.resolve(store.persist.rehydrate()))).finally(() => {
      if (cancelled) return;
      useOrdersStore.getState().seedIfNeeded();
      useWishlistStore.getState().clearGuestIfNewSession();
      setHydrated();
    });

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.storageArea !== window.localStorage) return;
      const store = PERSISTED_STORES[event.key as keyof typeof PERSISTED_STORES];
      if (store) void store.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, [setHydrated]);

  return null;
}
