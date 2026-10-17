"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ShoppingBag } from "lucide-react";
import { useCartView } from "../hooks/useCartView";
import { useCartStore } from "@/store/cart.store";
import { useHydrated } from "@/store/hydration.store";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { RecommendationRail } from "@/features/recommendations/components/recommendation-rail";
import { EmptyState, StaleDataBanner } from "@/components/common/state-views";
import { ProductImage } from "@/components/common/product-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { CartLine } from "./cart-line";
import { CouponInput } from "./coupon-input";
import { OrderSummaryRows } from "./order-summary";

function SavedForLater() {
  const saved = useCartStore((s) => s.saved);
  const moveToCart = useCartStore((s) => s.moveToCart);
  const removeSaved = useCartStore((s) => s.removeSaved);
  const { byId } = useCatalog();
  if (!saved.length) return null;
  return (
    <section aria-labelledby="saved-heading" className="rounded-xl border bg-card p-5">
      <h2 id="saved-heading" className="mb-2 font-semibold">Saved for later ({saved.length})</h2>
      <ul className="divide-y">
        {saved.map((item) => {
          const p = byId.get(item.productId);
          const out = !p || p.stock <= 0;
          return (
            <li key={item.key} className="flex items-center gap-4 py-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-white"><ProductImage src={p?.thumbnail ?? item.snapshot.thumbnail} alt={item.snapshot.title} sizes="64px" /></span>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${item.productId}`} className="line-clamp-1 text-sm font-medium hover:underline">{p?.title ?? item.snapshot.title}</Link>
                <p className="text-sm">{formatPrice(p?.price ?? item.unitPrice)} {out && <span className="text-xs font-medium text-destructive">· Out of stock</span>}</p>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row">
                <Button size="sm" variant="outline" disabled={out} onClick={() => moveToCart(item.key)}>Move to cart</Button>
                <Button size="sm" variant="ghost" onClick={() => removeSaved(item.key)}>Remove</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Cart (MOD-05). */
export function CartView() {
  const hydrated = useHydrated();
  const router = useRouter();
  const view = useCartView();
  const couponCode = useCartStore((s) => s.couponCode);
  const setAllSelected = useCartStore((s) => s.setAllSelected);

  if (!hydrated || (view.isLoading && !view.isEmpty)) {
    return (
      <div className="container-page grid grid-cols-1 gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px]" role="status" aria-label="Loading cart">
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (view.isEmpty) {
    return (
      <div className="container-page space-y-10 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Your cart</h1>
        <EmptyState icon={<ShoppingBag className="size-7" />} title="Your cart is empty" description="Looks like you haven't added anything yet. Explore today's deals and find something you'll love." action={{ label: "Start shopping", href: "/products" }} />
        <SavedForLater />
        <RecommendationRail request={{ strategy: "personalized", limit: 12 }} options={{ fallback: "trending" }} />
      </div>
    );
  }

  const blockReason = view.nothingSelected
    ? "Select at least one item to check out."
    : !view.apiAvailable
      ? "We can't verify stock and prices right now. Retry to continue."
      : view.issues.length
        ? `Resolve ${view.issues.length} ${view.issues.length === 1 ? "issue" : "issues"} in your cart to continue.`
        : null;
  const selectedCount = view.selectedLines.reduce((n, l) => n + l.item.quantity, 0);

  return (
    <div className="container-page space-y-10 py-8">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Your cart <span className="text-base font-normal text-muted-foreground">({view.cartCount} {view.cartCount === 1 ? "item" : "items"})</span></h1>
          {view.isStale && <StaleDataBanner onRetry={() => void view.retry()} message="We couldn't refresh prices and stock. Showing your last saved cart details." />}
          <section aria-label="Cart items" className="rounded-xl border bg-card px-5">
            <label className="flex cursor-pointer items-center gap-3 border-b py-3 text-sm font-medium">
              <Checkbox
                checked={view.allSelected}
                onCheckedChange={() => setAllSelected(!view.allSelected)}
                aria-label="Select all items"
                className="size-5"
              />
              Select all ({view.lines.length})
            </label>
            <ul className="divide-y">
              {view.lines.map((line) => <CartLine key={line.item.key} line={line} />)}
            </ul>
          </section>
          <SavedForLater />
        </div>

        <Card className="lg:sticky lg:top-32">
          <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <CouponInput subtotal={view.totals.subtotal} />
            <OrderSummaryRows totals={view.totals} couponCode={couponCode} />
            {blockReason && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{blockReason}</p>}
            <Button size="lg" variant="accent" className="w-full" disabled={view.blocked} onClick={() => router.push("/checkout")}>
              <Lock /> Proceed to checkout{selectedCount ? ` (${selectedCount})` : ""}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Test-mode checkout · no real payment is taken</p>
          </CardContent>
        </Card>
      </div>
      <RecommendationRail request={{ strategy: "cart", limit: 12 }} options={{ fallback: "trending" }} />
    </div>
  );
}
