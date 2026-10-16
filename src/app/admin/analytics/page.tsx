import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Recommendation analytics" };

// Heavier admin panel is code-split (PRD §12).
const AnalyticsView = dynamic(() => import("@/features/admin/components/analytics-view").then((m) => m.AnalyticsView), { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> });

export default function AdminAnalyticsPage() {
  return <AnalyticsView />;
}
