import type { CartItem, CartTotals, DeliveryMethodId, Order, PaymentMethodId, User } from "@/types";
import type { AddressValues, CustomerInfoValues } from "@/lib/validation";
import { PAYMENT_METHODS } from "@/lib/constants";
import { deliveryMethod } from "@/services/delivery/delivery.service";
import { expectedDelivery } from "@/services/orders/orders.service";
import { createOrderId } from "@/utils/id";

/**
 * Mock payment (PRD §5.6). Runs entirely client-side, never transmits data,
 * and never collects real card numbers, CVVs, bank logins or UPI PINs —
 * the customer picks a *test scenario* instead.
 */
export type PaymentInput =
  | { method: "mock-card"; scenario: "success" | "declined" | "insufficient-funds" }
  | { method: "mock-upi"; handle: "success@mockupi" | "failure@mockupi" }
  | { method: "mock-cod" };

export type PaymentResult = { ok: true; reference: string } | { ok: false; message: string };

export async function simulatePayment(input: PaymentInput, latencyMs = 1200): Promise<PaymentResult> {
  await new Promise((r) => setTimeout(r, latencyMs));
  const reference = `MOCK-${Date.now().toString(36).toUpperCase()}`;
  if (input.method === "mock-card") {
    if (input.scenario === "declined") return { ok: false, message: "The test card was declined by the (simulated) bank. Try another test scenario or payment method." };
    if (input.scenario === "insufficient-funds") return { ok: false, message: "Payment failed: insufficient funds on the test card." };
    return { ok: true, reference };
  }
  if (input.method === "mock-upi") {
    if (input.handle === "failure@mockupi") return { ok: false, message: "The UPI request was rejected (simulated). Try again or choose another method." };
    return { ok: true, reference };
  }
  return { ok: true, reference: `COD-${reference.slice(5)}` };
}

export interface BuildOrderInput {
  user: User;
  customer: CustomerInfoValues;
  address: AddressValues;
  deliveryId: DeliveryMethodId;
  payment: { method: PaymentMethodId; reference: string };
  lines: { item: CartItem; price: number; title: string; thumbnail: string }[];
  totals: CartTotals;
  couponCode: string | null;
  now?: Date;
}

export function buildOrder(input: BuildOrderInput): Order {
  const now = input.now ?? new Date();
  const delivery = deliveryMethod(input.deliveryId);
  const { label: _label, ...address } = input.address;
  return {
    id: createOrderId(now),
    userId: input.user.id,
    customerName: input.customer.fullName,
    customerEmail: input.customer.email,
    phone: input.customer.phone,
    createdAt: now.toISOString(),
    lines: input.lines.map(({ item, price, title, thumbnail }) => ({
      productId: item.productId,
      variantId: item.variantId,
      variantLabel: item.variantLabel,
      title,
      thumbnail,
      quantity: item.quantity,
      unitPrice: price,
    })),
    address: { ...address, line2: address.line2 || undefined },
    delivery: { id: delivery.id, label: delivery.label, cost: delivery.cost },
    payment: { method: input.payment.method, label: PAYMENT_METHODS.find((m) => m.id === input.payment.method)?.label ?? input.payment.method, reference: input.payment.reference },
    totals: input.totals,
    couponCode: input.couponCode,
    status: "placed",
    timeline: [{ status: "placed", at: now.toISOString() }],
    expectedDelivery: expectedDelivery(now, delivery.id === "same-day" ? [0, 1] : delivery.etaDays),
    source: "local",
  };
}
