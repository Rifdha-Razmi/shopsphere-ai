"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWishlistStore } from "@/store/wishlist.store";
import { useHydrated } from "@/store/hydration.store";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useAddToCart } from "@/features/cart/hooks/useAddToCart";
import { RecommendationRail } from "@/features/recommendations/components/recommendation-rail";
import { EmptyState, StaleDataBanner } from "@/components/common/state-views";
import { ProductImage } from "@/components/common/product-image";
import { Price } from "@/components/common/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { stockFor } from "@/services/catalog/normalize";
import { useAuth } from "@/features/auth/hooks/useAuth";

/** Wishlist (MOD-09): live price & stock, move to cart, wishlist-based recommendations. */
export function WishlistView({ embedded = false }: { embedded?: boolean }) {
  const hydrated = useHydrated();
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  const { byId, isLoading, isStale, refetch } = useCatalog();
  const addToCart = useAddToCart();
  const { isAuthenticated } = useAuth();

  if (!hydrated || (isLoading && items.length > 0)) {
    return <div className="grid gap-3" role="status" aria-label="Loading wishlist">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-8">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wishlist</h1>
          <p className="text-sm text-muted-foreground">{items.length} saved {items.length === 1 ? "item" : "items"}</p>
        </div>
      )}
      {isStale && <StaleDataBanner onRetry={() => void refetch()} />}
      {/* PRD §4.3: guest wishlists are session-only. */}
      {!isAuthenticated && items.length > 0 && (
        <p className="rounded-lg border bg-card px-4 py-3 text-sm">
          <Link href="/login?next=/wishlist" className="font-medium text-primary hover:underline">Sign in</Link> to keep your wishlist after you close this tab.
        </p>
      )}
      {items.length === 0 ? (
        <EmptyState icon={<Heart className="size-7" />} title="Your wishlist is empty" description="Tap the heart on any product to save it here and keep an eye on its price." action={{ label: "Browse products", href: "/products" }} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Wishlist items">
          {items.map((item) => {
            const p = byId.get(item.productId);
            const unavailable = !p;
            const outOfStock = !!p && p.stock <= 0;
            const needsVariant = !!p && p.variants.length > 0;
            const priceDrop = p && p.price < item.snapshot.price;
            return (
              <li key={item.productId} className="flex gap-4 rounded-xl border bg-card p-3">
                <Link href={`/product/${item.productId}`} className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-white">
                  <ProductImage src={p?.thumbnail ?? item.snapshot.thumbnail} alt={item.snapshot.title} sizes="96px" className={outOfStock || unavailable ? "opacity-50 grayscale" : undefined} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Link href={`/product/${item.productId}`} className="line-clamp-2 text-sm font-medium hover:underline">{p?.title ?? item.snapshot.title}</Link>
                  {p ? <Price price={p.price} mrp={p.mrp} discount={p.discountPercentage} size="sm" /> : <span className="text-sm text-muted-foreground">Last seen at {formatPrice(item.snapshot.price)}</span>}
                  <div className="flex flex-wrap gap-1">
                    {unavailable && <Badge variant="destructive">No longer available</Badge>}
                    {outOfStock && <Badge variant="destructive">Out of stock</Badge>}
                    {p && !outOfStock && <Badge variant="success">In stock</Badge>}
                    {priceDrop && <Badge variant="warning">Price dropped {formatPrice(item.snapshot.price - p.price)}</Badge>}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    {needsVariant && !outOfStock ? (
                      <Button size="sm" variant="outline" asChild><Link href={`/product/${item.productId}`}>Choose options</Link></Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={unavailable || outOfStock}
                        aria-label={`Move ${item.snapshot.title} to cart`}
                        onClick={() => {
                          if (!p) return;
                          const variant = p.variants.find((v) => stockFor(p, v.id) > 0)?.id ?? null;
                          const r = addToCart(p, variant, 1, { silent: true });
                          if (r.ok) {
                            remove(p.id);
                            toast.success("Moved to cart", { description: p.title });
                          }
                        }}
                      >
                        <ShoppingCart /> Move to cart
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(item.productId)} aria-label={`Remove ${item.snapshot.title} from wishlist`}><Trash2 /> Remove</Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <RecommendationRail request={{ strategy: "wishlist", limit: 12 }} options={{ fallback: "trending" }} />
    </div>
  );
}
