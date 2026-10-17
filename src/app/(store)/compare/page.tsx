import type { Metadata } from "next";
import { CompareView } from "@/features/products/components/compare-view";

export const metadata: Metadata = { title: "Compare products" };

export default function ComparePage() {
  return (
    <div className="container-page space-y-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Compare products</h1>
      <CompareView />
    </div>
  );
}
