"use client";

import { memo } from "react";
import Link from "next/link";
import { Eye, ShoppingCart } from "lucide-react";
import type { Product, RecommendationStrategy } from "@/types";
import { ProductImage } from "@/components/common/product-image";
import { Price } from "@/components/common/price";
import { RatingPill } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { useAddToCart } from "@/features/cart/hooks/useAddToCart";
import { useUiStore } from "@/store/ui.store";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { CompareToggle } from "./compare-toggle";
import { cn } from "@/lib/cn";

interface ProductCardProps {
  product: Product;
  /** Shown under the title for recommendation cards, e.g. "Similar price". */
  reason?: string;
  strategy?: RecommendationStrategy;
  onNavigate?: () => void;
  priority?: boolean;
  compact?: boolean;
  showCompare?: boolean;
}

function ProductCardBase({ product, reason, onNavigate, priority, compact, showCompare = true }: ProductCardProps) {
  const addToCart = useAddToCart();
  const openQuickView = useUiStore((s) => s.openQuickView);
  const outOfStock = product.stock <= 0;
  const needsVariant = product.variants.length > 0;
  const href = `/product/${product.id}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md" aria-labelledby={`p-${product.id}-title`}>
      <div className="relative aspect-square bg-white">
        <Link href={href} onClick={onNavigate} tabIndex={-1} aria-hidden className="absolute inset-0 p-3">
          <span className="relative block size-full">
            <ProductImage src={product.thumbnail} alt={product.title} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" priority={priority} className="transition-transform duration-300 group-hover:scale-[1.03]" />
          </span>
        </Link>
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {product.discountPercentage >= 10 && <Badge variant="deal">{product.discountPercentage}% off</Badge>}
          {product.isLocal && <Badge variant="local">New · local</Badge>}
        </div>
        <WishlistButton product={product} className="absolute top-2 right-2 z-10" />
        {!compact && (
          <button
            type="button"
            onClick={() => openQuickView(product.id)}
            className="absolute bottom-2 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium shadow ring-1 ring-border transition group-hover:flex focus-visible:flex"
            aria-label={`Quick view ${product.title}`}
          >
            <Eye className="size-3.5" /> Quick view
          </button>
        )}
        {outOfStock && <div className="absolute inset-x-0 bottom-0 bg-foreground/75 py-1 text-center text-xs font-semibold text-background">Out of stock</div>}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{product.brand}</p>
        <h3 id={`p-${product.id}-title`} className="line-clamp-2 min-h-10 text-sm leading-5 font-medium">
          <Link href={href} onClick={onNavigate} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.title}
          </Link>
        </h3>
        <RatingPill rating={product.rating} count={product.reviewCount} />
        <Price price={product.price} mrp={product.mrp} discount={product.discountPercentage} />
        {reason && <p className="line-clamp-1 text-xs text-primary">{reason}</p>}
        {!outOfStock && product.stock <= LOW_STOCK_THRESHOLD && <p className="text-xs font-medium text-destructive">Only {product.stock} left</p>}

        <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-2">
          {showCompare && !compact ? <CompareToggle productId={product.id} title={product.title} /> : <span />}
          {needsVariant ? (
            <Button size="sm" variant="outline" asChild className={cn(outOfStock && "pointer-events-none opacity-50")}>
              <Link href={href} onClick={onNavigate} aria-label={`Choose options for ${product.title}`}>
                Options
              </Link>
            </Button>
          ) : (
            <Button size="sm" variant="accent" disabled={outOfStock} onClick={() => addToCart(product, null)} aria-label={`Add ${product.title} to cart`}>
              <ShoppingCart /> Add
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card" aria-hidden>
      <div className="skeleton-shimmer aspect-square" />
      <div className="space-y-2 p-3">
        <div className="skeleton-shimmer h-3 w-16 rounded" />
        <div className="skeleton-shimmer h-4 w-full rounded" />
        <div className="skeleton-shimmer h-4 w-2/3 rounded" />
        <div className="skeleton-shimmer h-5 w-24 rounded" />
        <div className="skeleton-shimmer mt-3 h-8 w-full rounded" />
      </div>
    </div>
  );
}
