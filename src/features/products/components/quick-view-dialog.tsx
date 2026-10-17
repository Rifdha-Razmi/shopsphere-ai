"use client";

import Link from "next/link";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useUiStore } from "@/store/ui.store";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ProductImage } from "@/components/common/product-image";
import { Price } from "@/components/common/price";
import { RatingPill } from "@/components/common/rating-stars";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAddToCart } from "@/features/cart/hooks/useAddToCart";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { truncate } from "@/utils/text";

/** Quick View modal (MOD-02): key details without a full page navigation. */
export function QuickViewDialog() {
  const id = useUiStore((s) => s.quickViewId);
  const close = useUiStore((s) => s.closeQuickView);
  const { byId } = useCatalog();
  const product = id !== null ? byId.get(id) : undefined;
  const addToCart = useAddToCart();

  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl">
        {product ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="relative aspect-square rounded-lg bg-white">
              <ProductImage src={product.images[0] ?? product.thumbnail} alt={product.title} sizes="(max-width: 640px) 90vw, 380px" />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{product.brand}</p>
              <DialogTitle className="text-xl">{product.title}</DialogTitle>
              <RatingPill rating={product.rating} count={product.reviewCount} />
              <Price price={product.price} mrp={product.mrp} discount={product.discountPercentage} size="lg" />
              <div>{product.stock > 0 ? <Badge variant="success">In stock</Badge> : <Badge variant="destructive">Out of stock</Badge>}</div>
              <DialogDescription>{truncate(product.description, 220)}</DialogDescription>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {product.variants.length ? (
                  <Button variant="accent" asChild onClick={close}>
                    <Link href={`/product/${product.id}`}>Choose options</Link>
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    disabled={product.stock <= 0}
                    onClick={() => {
                      addToCart(product, null);
                      close();
                    }}
                  >
                    Add to cart
                  </Button>
                )}
                <Button variant="outline" asChild onClick={close}>
                  <Link href={`/product/${product.id}`}>View full details</Link>
                </Button>
                <WishlistButton product={product} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <DialogTitle>Product unavailable</DialogTitle>
            <DialogDescription>This product is no longer available.</DialogDescription>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
