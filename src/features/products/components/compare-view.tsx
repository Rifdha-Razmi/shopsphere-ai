"use client";

import Link from "next/link";
import { GitCompareArrows, X } from "lucide-react";
import type { Product } from "@/types";
import { useUiStore } from "@/store/ui.store";
import { useHydrated } from "@/store/hydration.store";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useAddToCart } from "@/features/cart/hooks/useAddToCart";
import { EmptyState } from "@/components/common/state-views";
import { ProductImage } from "@/components/common/product-image";
import { RatingStars } from "@/components/common/rating-stars";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Side-by-side comparison of 2–4 products (MOD-02). Best values are highlighted. */
export function CompareView() {
  const hydrated = useHydrated();
  const ids = useUiStore((s) => s.compareIds);
  const remove = useUiStore((s) => s.removeCompare);
  const clear = useUiStore((s) => s.clearCompare);
  const { byId, isLoading } = useCatalog();
  const { nameOf } = useCategories();
  const addToCart = useAddToCart();

  if (!hydrated || isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  const products = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);

  if (products.length < 2) {
    return (
      <EmptyState
        icon={<GitCompareArrows className="size-7" />}
        title={products.length === 1 ? "Add one more product to compare" : "Nothing to compare yet"}
        description="Tick “Compare” on 2 to 4 products while browsing to see them side by side."
        action={{ label: "Browse products", href: "/products" }}
      />
    );
  }

  const minPrice = Math.min(...products.map((p) => p.price));
  const maxRating = Math.max(...products.map((p) => p.rating));
  const rows: { label: string; render: (p: Product) => React.ReactNode; best?: (p: Product) => boolean }[] = [
    { label: "Price", render: (p) => <span className="font-semibold">{formatPrice(p.price)}</span>, best: (p) => p.price === minPrice },
    { label: "MRP", render: (p) => formatPrice(p.mrp) },
    { label: "Discount", render: (p) => (p.discountPercentage ? `${p.discountPercentage}%` : "—") },
    { label: "Rating", render: (p) => <span className="inline-flex items-center gap-1.5"><RatingStars rating={p.rating} /> {p.rating.toFixed(1)}</span>, best: (p) => p.rating === maxRating },
    { label: "Reviews", render: (p) => p.reviewCount },
    { label: "Brand", render: (p) => p.brand },
    { label: "Category", render: (p) => nameOf(p.category) },
    { label: "Availability", render: (p) => (p.stock > 0 ? `In stock (${p.stock})` : "Out of stock") },
    { label: "Options", render: (p) => (p.variants.length ? p.variants.map((v) => Object.values(v.attributes).join(" ")).join(", ") : "—") },
    { label: "Warranty", render: (p) => p.warrantyInformation || "—" },
    { label: "Shipping", render: (p) => p.shippingInformation || "—" },
    { label: "Returns", render: (p) => p.returnPolicy || "—" },
    { label: "Weight", render: (p) => (p.weight ? `${p.weight} g` : "—") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={clear}>Clear comparison</Button></div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <caption className="sr-only">Comparison of {products.length} products</caption>
          <thead>
            <tr>
              <th scope="col" className="w-36 p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Product</th>
              {products.map((p) => (
                <th key={p.id} scope="col" className="p-3 align-top font-normal">
                  <div className="relative space-y-2 text-left">
                    <button type="button" onClick={() => remove(p.id)} className="absolute -top-1 right-0 rounded p-1 hover:bg-muted" aria-label={`Remove ${p.title} from comparison`}><X className="size-4" /></button>
                    <Link href={`/product/${p.id}`} className="relative block aspect-square w-full max-w-40 overflow-hidden rounded-lg bg-white"><ProductImage src={p.thumbnail} alt={p.title} sizes="160px" /></Link>
                    <Link href={`/product/${p.id}`} className="line-clamp-2 font-medium hover:underline">{p.title}</Link>
                    {p.variants.length ? (
                      <Button size="sm" variant="outline" asChild><Link href={`/product/${p.id}`}>Choose options</Link></Button>
                    ) : (
                      <Button size="sm" variant="accent" disabled={p.stock <= 0} onClick={() => addToCart(p, null)}>Add to cart</Button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t">
                <th scope="row" className="bg-muted/40 p-3 text-left text-xs font-semibold text-muted-foreground uppercase">{row.label}</th>
                {products.map((p) => {
                  const best = row.best?.(p) && products.length > 1;
                  return (
                    <td key={p.id} className={cn("p-3 align-top", best && "bg-success/8")}>
                      {row.render(p)}
                      {best && <span className="ml-1.5 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">Best</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
