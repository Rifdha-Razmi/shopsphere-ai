import type { Metadata } from "next";
import { WishlistView } from "@/features/wishlist/components/wishlist-view";
import { RequireAuth } from "@/features/auth/components/require-auth";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <RequireAuth role="customer" allowGuests>
      <div className="container-page py-8">
        <WishlistView />
      </div>
    </RequireAuth>
  );
}
