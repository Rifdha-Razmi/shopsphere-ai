"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, PackageX, RotateCcw, ShieldCheck, ShoppingCart, Truck, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { useProduct } from "@/features/products/hooks/useProduct";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useAddToCart } from "@/features/cart/hooks/useAddToCart";
import { stockFor } from "@/services/catalog/normalize";
import { clampQuantity, lineKey } from "@/services/cart/cart.service";
import { useCartStore } from "@/store/cart.store";
import { useSignalsStore } from "@/store/signals.store";
import { useHydrated } from "@/store/hydration.store";
import { RecommendationRail } from "@/features/recommendations/components/recommendation-rail";
import { ReviewsSection } from "@/features/reviews/components/reviews-section";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { Price } from "@/components/common/price";
import { RatingStars } from "@/components/common/rating-stars";
import { QuantityStepper } from "@/components/common/quantity-stepper";
import { EmptyState, ErrorState, StaleDataBanner } from "@/components/common/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { toUserMessage } from "@/services/api/http";
import { CompareToggle } from "./compare-toggle";
import { DeliveryCheck } from "./delivery-check";
import { ProductGallery } from "./product-gallery";
import { VariantSelector } from "./variant-selector";

function PdpSkeleton() {
  return (
    <div className="container-page grid grid-cols-1 gap-8 py-6 md:grid-cols-2" role="status" aria-label="Loading product">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function Specs({ product, categoryName }: { product: Product; categoryName: string }) {
  const rows: [string, string][] = [
    ["Brand", product.brand],
    ["Category", categoryName],
    ["SKU", product.sku || "—"],
    ["Weight", product.weight ? `${product.weight} g` : "—"],
    ["Dimensions", product.dimensions ? `${product.dimensions.width} × ${product.dimensions.height} × ${product.dimensions.depth} cm` : "—"],
    ["Warranty", product.warrantyInformation || "—"],
    ["Shipping", product.shippingInformation || "—"],
    ["Returns", product.returnPolicy || "—"],
    ["Tags", product.tags.join(", ") || "—"],
  ];
  return (
    <dl className="grid grid-cols-1 divide-y rounded-xl border bg-card text-sm sm:grid-cols-[180px_minmax(0,1fr)] sm:divide-y-0">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="bg-muted/50 px-4 py-2.5 font-medium sm:border-b">{k}</dt>
          <dd className="px-4 py-2.5 text-muted-foreground sm:border-b">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function BuyBox({ product }: { product: Product }) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const setAllSelected = useCartStore((s) => s.setAllSelected);
  const setSelected = useCartStore((s) => s.setSelected);
  const hasVariants = product.variants.length > 0;
  const firstInStock = product.variants.find((v) => v.stock > 0)?.id ?? null;
  const [variantId, setVariantId] = useState<string | null>(hasVariants ? firstInStock : null);
  const [qty, setQty] = useState(1);
  const [qtyMessage, setQtyMessage] = useState<string | null>(null);
  const available = stockFor(product, variantId);
  const selectedOut = hasVariants ? !variantId || available <= 0 : product.stock <= 0;

  const changeQty = (n: number) => {
    const { quantity, clamped } = clampQuantity(n, available);
    setQty(Math.max(1, quantity));
    setQtyMessage(clamped && n > available ? `Only ${available} available — quantity set to ${available}.` : null);
  };

  const add = (buyNow: boolean) => {
    if (hasVariants && !variantId) return toast.error("Please choose an option first.");
    const result = addToCart(product, variantId, qty, { silent: buyNow });
    if (result.ok && buyNow) {
      // Buy now checks out just this product; anything else stays in the cart, unticked.
      setAllSelected(false);
      setSelected(lineKey(product.id, variantId), true);
      router.push("/checkout");
    }
  };

  return (
    <div className="space-y-5">
      <Price price={product.price} mrp={product.mrp} discount={product.discountPercentage} size="xl" />

      {hasVariants && (
        <VariantSelector
          variants={product.variants}
          selectedId={variantId}
          onSelect={(id) => {
            setVariantId(id);
            setQty(1);
            setQtyMessage(null);
          }}
        />
      )}

      <div aria-live="polite">
        {product.stock <= 0 ? (
          <Badge variant="destructive" className="text-sm">Out of stock</Badge>
        ) : selectedOut ? (
          <Badge variant="destructive" className="text-sm">Selected option is out of stock</Badge>
        ) : available <= LOW_STOCK_THRESHOLD ? (
          <Badge variant="warning" className="text-sm">Hurry — only {available} left</Badge>
        ) : (
          <Badge variant="success" className="text-sm">In stock</Badge>
        )}
      </div>

      {!selectedOut && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium" id="qty-label">Quantity</p>
          <QuantityStepper value={qty} max={available} onChange={changeQty} label="Quantity" />
          {qtyMessage && <p className="text-xs font-medium text-destructive" role="status">{qtyMessage}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_1fr_auto]">
        <Button size="lg" variant="accent" onClick={() => add(false)} disabled={selectedOut}>
          <ShoppingCart /> {selectedOut ? (product.stock <= 0 ? "Out of stock" : "Option unavailable") : "Add to cart"}
        </Button>
        <Button size="lg" onClick={() => add(true)} disabled={selectedOut}>
          <Zap /> Buy now
        </Button>
        <WishlistButton product={product} variant="full" />
      </div>
      {selectedOut && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{product.stock <= 0 ? "This product is currently unavailable." : "This option is sold out — other options are still available above."}</span>
          <Button size="sm" variant="outline" onClick={() => toast.success("We'll let you know when it's back (simulated).")}>
            <Bell /> Notify me
          </Button>
        </div>
      )}
      <CompareToggle productId={product.id} title={product.title} className="text-sm" />
    </div>
  );
}

/** Product Detail Page (MOD-04). */
export function ProductDetailView({ id }: { id: number }) {
  const state = useProduct(id);
  const hydrated = useHydrated();
  const recordView = useSignalsStore((s) => s.recordView);
  const { nameOf } = useCategories();
  const product = state.status === "ready" ? state.product : null;

  useEffect(() => {
    if (hydrated && product) recordView(product.id);
  }, [hydrated, product?.id, recordView]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.status === "loading") return <PdpSkeleton />;
  if (state.status === "unavailable") {
    return (
      <div className="container-page space-y-10 py-10">
        <EmptyState icon={<PackageX className="size-7" />} title="This product is no longer available" description="It may have been removed from the catalogue. Here are some popular alternatives." action={{ label: "Continue shopping", href: "/products" }} />
        <RecommendationRail request={{ strategy: "trending", limit: 12 }} />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="container-page py-10">
        <ErrorState title="We couldn't load this product" description={toUserMessage(state.error)} onRetry={state.retry} />
      </div>
    );
  }

  const p = state.product;
  const category = nameOf(p.category);

  return (
    <div className="container-page space-y-12 py-6">
      {state.isStale && <StaleDataBanner />}
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:gap-12">
          <ProductGallery images={p.images} title={p.title} />
          <div className="space-y-6">
            <div className="space-y-2">
              <Link href={`/search?q=${encodeURIComponent(p.brand)}`} className="text-sm font-medium tracking-wide text-primary uppercase hover:underline">{p.brand}</Link>
              <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">{p.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <RatingStars rating={p.rating} size="md" />
                <span className="font-medium">{p.rating.toFixed(1)}</span>
                <a href="#reviews" className="text-primary hover:underline">{p.reviewCount} ratings & reviews</a>
                <span className="text-muted-foreground">·</span>
                <Link href={`/category/${p.category}`} className="text-muted-foreground hover:underline">{category}</Link>
              </div>
            </div>
            <BuyBox key={p.id} product={p} />
            <DeliveryCheck />
            <ul className="grid grid-cols-3 gap-2 text-center text-xs">
              <li className="rounded-lg border bg-card p-3"><Truck className="mx-auto mb-1 size-5 text-primary" aria-hidden />{p.shippingInformation || "Fast shipping"}</li>
              <li className="rounded-lg border bg-card p-3"><RotateCcw className="mx-auto mb-1 size-5 text-primary" aria-hidden />{p.returnPolicy || "Easy returns"}</li>
              <li className="rounded-lg border bg-card p-3"><ShieldCheck className="mx-auto mb-1 size-5 text-primary" aria-hidden />{p.warrantyInformation || "Warranty"}</li>
            </ul>
          </div>
        </div>
      </div>

      <Tabs defaultValue="description">
        <TabsList aria-label="Product information">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
        </TabsList>
        <TabsContent value="description">
          <p className="max-w-3xl leading-relaxed text-foreground/90">{p.description}</p>
        </TabsContent>
        <TabsContent value="specs">
          <Specs product={p} categoryName={category} />
        </TabsContent>
      </Tabs>

      <RecommendationRail request={{ strategy: "frequently-bought", productId: p.id, limit: 8 }} />

      <RecommendationRail request={{ strategy: "similar", productId: p.id, limit: 12 }} />
      <RecommendationRail request={{ strategy: "category", category: p.category, limit: 12, exclude: [p.id] }} title={`Related in ${category}`} />

      <div id="reviews" className="scroll-mt-32">
        <ReviewsSection product={p} />
      </div>

      <RecommendationRail request={{ strategy: "personalized", limit: 12, exclude: [p.id] }} title="You May Also Like" options={{ fallback: "trending" }} />
    </div>
  );
}
