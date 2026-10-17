import type { Metadata } from "next";
import { ReviewsAdmin } from "@/features/admin/components/reviews-admin";
export const metadata: Metadata = { title: "Reviews" };
export default function Page() {
  return <ReviewsAdmin />;
}
