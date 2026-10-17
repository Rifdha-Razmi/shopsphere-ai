import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DeliveryMethodId, PaymentMethodId } from "@/types";
import type { AddressValues, CustomerInfoValues } from "@/lib/validation";

export const CHECKOUT_STEPS = ["Customer", "Address", "Delivery", "Summary", "Payment", "Confirmation"] as const;
export type CheckoutStep = 0 | 1 | 2 | 3 | 4 | 5;

export type MockCardScenario = "success" | "declined" | "insufficient-funds";
export type MockUpiHandle = "success@mockupi" | "failure@mockupi";

/**
 * In-progress checkout, persisted so a refresh (MOD-06-002) or an expired
 * session (MOD-06-001) resumes on the same step with the same data.
 */
interface CheckoutState {
  step: CheckoutStep;
  ownerId: string | null;
  customer: CustomerInfoValues | null;
  address: AddressValues | null;
  savedAddressId: string | null;
  deliveryId: DeliveryMethodId;
  payment: { method: PaymentMethodId; cardScenario: MockCardScenario; upiHandle: MockUpiHandle };
  paymentError: string | null;
  attempts: number;
  lastOrderId: string | null;
  updatedAt: number;
  setStep: (step: CheckoutStep) => void;
  setCustomer: (v: CustomerInfoValues) => void;
  setAddress: (v: AddressValues, savedAddressId?: string | null) => void;
  setDelivery: (id: DeliveryMethodId) => void;
  setPayment: (patch: Partial<CheckoutState["payment"]>) => void;
  setPaymentError: (message: string | null) => void;
  complete: (orderId: string) => void;
  reset: (ownerId?: string | null) => void;
}

const initial = {
  step: 0 as CheckoutStep,
  ownerId: null,
  customer: null,
  address: null,
  savedAddressId: null,
  deliveryId: "standard" as DeliveryMethodId,
  payment: { method: "mock-upi" as PaymentMethodId, cardScenario: "success" as MockCardScenario, upiHandle: "success@mockupi" as MockUpiHandle },
  paymentError: null,
  attempts: 0,
  lastOrderId: null,
  updatedAt: 0,
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...initial,
      setStep: (step) => set({ step, updatedAt: Date.now() }),
      setCustomer: (customer) => set({ customer, updatedAt: Date.now() }),
      setAddress: (address, savedAddressId = null) => set({ address, savedAddressId, updatedAt: Date.now() }),
      setDelivery: (deliveryId) => set({ deliveryId, updatedAt: Date.now() }),
      setPayment: (patch) => set({ payment: { ...get().payment, ...patch }, paymentError: null, updatedAt: Date.now() }),
      setPaymentError: (paymentError) => set({ paymentError, attempts: get().attempts + (paymentError ? 1 : 0), updatedAt: Date.now() }),
      complete: (orderId) => set({ ...initial, lastOrderId: orderId, step: 5, ownerId: get().ownerId, updatedAt: Date.now() }),
      reset: (ownerId = null) => set({ ...initial, ownerId, updatedAt: Date.now() }),
    }),
    { name: "ss-checkout", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
