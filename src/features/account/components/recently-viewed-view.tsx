"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import type { Product } from "@/types";
import { useSignalsStore } from "@/store/signals.store";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { ProductGrid, ProductGridSkeleton } from "@/features/products/components/product-grid";
import { EmptyState } from "@/components/common/state-views";
import { Button } from "@/components/ui/button";

export function RecentlyViewedView() {
  const viewed = useSignalsStore((s) => s.recentlyViewed);
  const clear = useSignalsStore((s) => s.clearRecentlyViewed);
  const { byId, isLoading } = useCatalog();
  const products = useMemo(() => viewed.map((v) => byId.get(v.productId)).filter((p): p is Product => !!p && !p.archived), [viewed, byId]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Recently viewed</h1>
        {viewed.length > 0 && <Button variant="outline" size="sm" onClick={clear}>Clear history</Button>}
      </div>
      {isLoading ? <ProductGridSkeleton count={8} /> : products.length === 0 ? (
        <EmptyState icon={<Clock className="size-7" />} title="Nothing viewed yet" description="Products you open will appear here, most recent first." action={{ label: "Browse products", href: "/products" }} />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
