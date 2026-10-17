import { redirect } from "next/navigation";

/** The wishlist has one home: /wishlist (header heart icon). */
export default function AccountWishlistPage() {
  redirect("/wishlist");
}
