import { Suspense } from "react";
import type { Metadata } from "next";
import { DiscoveryView } from "@/features/products/components/discovery-view";
import { ProductGridSkeleton } from "@/features/products/components/product-grid";
import { humanizeSlug } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: humanizeSlug(slug) };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="container-page py-6"><ProductGridSkeleton /></div>}>
      <DiscoveryView mode={{ kind: "category", slug: decodeURIComponent(slug) }} />
    </Suspense>
  );
}
