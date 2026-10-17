import { Suspense } from "react";
import type { Metadata } from "next";
import { DiscoveryView } from "@/features/products/components/discovery-view";
import { ProductGridSkeleton } from "@/features/products/components/product-grid";

export const metadata: Metadata = { title: "All products" };

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container-page py-6"><ProductGridSkeleton /></div>}>
      <DiscoveryView mode={{ kind: "all" }} />
    </Suspense>
  );
}
