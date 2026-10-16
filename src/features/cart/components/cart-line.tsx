"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bookmark, Trash2 } from "lucide-react";
import type { CartLineView } from "../hooks/useCartView";
import { useCartStore } from "@/store/cart.store";
import { ProductImage } from "@/components/common/product-image";
import { QuantityStepper } from "@/components/common/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

/** One cart line with in-place failure handling (PRD §5.5). */
export function CartLine({ line }: { line: CartLineView }) {
  const { item, issue, available, product } = line;
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const saveForLater = useCartStore((s) => s.saveForLater);
  const acceptPrice = useCartStore((s) => s.acceptPrice);
  const setSelected = useCartStore((s) => s.setSelected);
  const [message, setMessage] = useState<string | null>(null);
  const blocked = issue?.type === "out-of-stock" || issue?.type === "unavailable";
  const title = product?.title ?? item.snapshot.title;

  const changeQty = (n: number) => {
    const r = setQuantity(item.key, n, available);
    // MOD-05-001: never silently accept more than is in stock.
    setMessage(r.clamped && n > available ? `Only ${available} in stock — quantity set to ${available}.` : null);
  };

  return (
    <li className="flex gap-3 py-5 sm:gap-4" aria-label={title}>
      <Checkbox
        checked={line.selected}
        onCheckedChange={(v) => setSelected(item.key, v === true)}
        aria-label={`Select ${title} for checkout`}
        className="mt-10 size-5 sm:mt-12"
      />
      <Link href={`/product/${item.productId}`} className={cn("relative size-24 shrink-0 overflow-hidden rounded-lg border bg-white sm:size-28", !line.selected && "opacity-60")}>
        <ProductImage src={product?.thumbnail ?? item.snapshot.thumbnail} alt={title} sizes="112px" className={blocked ? "opacity-50 grayscale" : undefined} />
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase">{item.snapshot.brand}</p>
            <Link href={`/product/${item.productId}`} className="line-clamp-2 font-medium hover:underline">{title}</Link>
            {item.variantLabel && <p className="text-xs text-muted-foreground">{item.variantLabel}</p>}
          </div>
          <div className="text-right">
            <p className="font-semibold">{formatPrice(line.price * item.quantity)}</p>
            {item.quantity > 1 && <p className="text-xs text-muted-foreground">{formatPrice(line.price)} each</p>}
          </div>
        </div>

        {issue && (
          <div role="alert" className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              <span>
                {issue.type === "out-of-stock" && "This item is now out of stock. Remove it or save it for later to continue."}
                {issue.type === "unavailable" && "This product is no longer available. Remove it to continue."}
                {issue.type === "insufficient-stock" && `Only ${issue.available} left in stock — you have ${item.quantity} in your cart.`}
                {issue.type === "price-changed" && (
                  <>Price {issue.newPrice > issue.oldPrice ? "increased" : "dropped"} from <s>{formatPrice(issue.oldPrice)}</s> to <strong>{formatPrice(issue.newPrice)}</strong>. Please confirm to continue.</>
                )}
              </span>
            </p>
            {issue.type === "insufficient-stock" && <Button size="sm" variant="outline" onClick={() => changeQty(issue.available)}>Update to {issue.available}</Button>}
            {issue.type === "price-changed" && <Button size="sm" onClick={() => acceptPrice(item.key, issue.newPrice)}>Accept new price</Button>}
            {issue.type === "unavailable" && <Button size="sm" variant="destructive" onClick={() => remove(item.key)}>Remove</Button>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {!blocked && <QuantityStepper value={item.quantity} max={Math.max(available, 1)} onChange={changeQty} label={`Quantity for ${title}`} size="sm" />}
          <button type="button" onClick={() => saveForLater(item.key)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Bookmark className="size-4" /> Save for later</button>
          <button type="button" onClick={() => remove(item.key)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /> Remove</button>
        </div>
        {message && <p role="status" className="text-xs font-medium text-destructive">{message}</p>}
      </div>
    </li>
  );
}
