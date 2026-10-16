import type { Metadata } from "next";
import { MyReviewsView } from "@/features/account/components/my-reviews-view";

export const metadata: Metadata = { title: "My reviews" };
export default function MyReviewsPage() {
  return <MyReviewsView />;
}
