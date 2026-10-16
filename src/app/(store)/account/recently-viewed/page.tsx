import type { Metadata } from "next";
import { RecentlyViewedView } from "@/features/account/components/recently-viewed-view";

export const metadata: Metadata = { title: "Recently viewed" };
export default function RecentlyViewedPage() {
  return <RecentlyViewedView />;
}
