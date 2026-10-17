import { Suspense } from "react";
import type { Metadata } from "next";
import { DiscoveryView } from "@/features/products/components/discovery-view";
import { ProductGridSkeleton } from "@/features/products/components/product-grid";
import { EmptyState } from "@/components/common/state-views";
import { MAX_SEARCH_LENGTH } from "@/lib/constants";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  if (!q) {
    return (
      <div className="container-page py-10">
        <EmptyState title="What are you looking for?" description="Type a product, brand or category in the search bar above." action={{ label: "Browse all products", href: "/products" }} />
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="container-page py-6"><ProductGridSkeleton /></div>}>
      <DiscoveryView key={q} mode={{ kind: "search", query: q }} />
    </Suspense>
  );
}
