import type { Metadata } from "next";
import { CartView } from "@/features/cart/components/cart-view";
import { RequireAuth } from "@/features/auth/components/require-auth";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <RequireAuth role="customer" allowGuests>
      <CartView />
    </RequireAuth>
  );
}
