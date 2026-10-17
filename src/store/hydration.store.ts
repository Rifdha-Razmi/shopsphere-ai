import { create } from "zustand";

/** Flips to true once every persisted store has rehydrated on the client (see StoreHydrator). */
export const useHydrationStore = create<{ hydrated: boolean; setHydrated: () => void }>((set) => ({
  hydrated: false,
  setHydrated: () => set({ hydrated: true }),
}));

export const useHydrated = () => useHydrationStore((s) => s.hydrated);
