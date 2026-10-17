import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Address } from "@/types";
import type { AddressValues } from "@/lib/validation";
import { createId } from "@/utils/id";

interface AccountState {
  addresses: Record<string, Address[]>;
  addAddress: (userId: string, values: AddressValues, makeDefault?: boolean) => Address;
  updateAddress: (userId: string, id: string, values: AddressValues) => void;
  removeAddress: (userId: string, id: string) => void;
  setDefault: (userId: string, id: string) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      addresses: {},

      addAddress: (userId, values, makeDefault = false) => {
        const list = get().addresses[userId] ?? [];
        const isDefault = makeDefault || list.length === 0;
        const address: Address = { ...values, line2: values.line2 || "", id: createId("adr"), isDefault };
        const next = [...(isDefault ? list.map((a) => ({ ...a, isDefault: false })) : list), address];
        set({ addresses: { ...get().addresses, [userId]: next } });
        return address;
      },

      updateAddress: (userId, id, values) =>
        set({ addresses: { ...get().addresses, [userId]: (get().addresses[userId] ?? []).map((a) => (a.id === id ? { ...a, ...values } : a)) } }),

      removeAddress: (userId, id) => {
        const list = (get().addresses[userId] ?? []).filter((a) => a.id !== id);
        if (list.length && !list.some((a) => a.isDefault)) list[0] = { ...list[0], isDefault: true };
        set({ addresses: { ...get().addresses, [userId]: list } });
      },

      setDefault: (userId, id) =>
        set({ addresses: { ...get().addresses, [userId]: (get().addresses[userId] ?? []).map((a) => ({ ...a, isDefault: a.id === id })) } }),
    }),
    { name: "ss-account", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
