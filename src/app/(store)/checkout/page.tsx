import type { Metadata } from "next";
import { CheckoutView } from "@/features/checkout/components/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="container-page space-y-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
      <CheckoutView />
    </div>
  );
}
