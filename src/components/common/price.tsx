import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Price({ price, mrp, discount, size = "md", className }: { price: number; mrp?: number; discount?: number; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const showMrp = mrp !== undefined && mrp > price;
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-3xl" };
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)} data-price={price}>
      <span className={cn("font-semibold tracking-tight", sizes[size])}>{formatPrice(price)}</span>
      {showMrp && (
        <>
          <span className="text-xs text-muted-foreground line-through">
            <span className="sr-only">Original price </span>
            {formatPrice(mrp)}
          </span>
          {discount ? <span className="text-xs font-semibold text-success">{discount}% off</span> : null}
        </>
      )}
    </span>
  );
}
