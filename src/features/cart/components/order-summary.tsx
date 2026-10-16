import type { CartTotals } from "@/types";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, TAX_RATE } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";

export function OrderSummaryRows({ totals, couponCode, deliveryLabel }: { totals: CartTotals; couponCode?: string | null; deliveryLabel?: string }) {
  const remaining = FREE_SHIPPING_THRESHOLD - (totals.subtotal - totals.couponDiscount);
  return (
    <div className="space-y-3 text-sm">
      <dl className="space-y-2">
        <div className="flex justify-between"><dt>Price ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})</dt><dd>{formatPrice(totals.mrpTotal)}</dd></div>
        {totals.productSavings > 0 && <div className="flex justify-between text-success"><dt>Product discount</dt><dd>− {formatPrice(totals.productSavings)}</dd></div>}
        {totals.couponDiscount > 0 && <div className="flex justify-between text-success"><dt>Coupon {couponCode ? `(${couponCode})` : ""}</dt><dd>− {formatPrice(totals.couponDiscount)}</dd></div>}
        <div className="flex justify-between"><dt>Shipping{deliveryLabel ? ` · ${deliveryLabel}` : ""} <span className="text-xs text-muted-foreground">(simulated)</span></dt><dd>{totals.shipping === 0 ? <span className="font-medium text-success">FREE</span> : formatPrice(totals.shipping)}</dd></div>
        <div className="flex justify-between"><dt>Estimated GST ({Math.round(TAX_RATE * 100)}%, simulated)</dt><dd>{formatPrice(totals.tax)}</dd></div>
        <div className="flex justify-between border-t pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(totals.total)}</dd></div>
      </dl>
      {totals.productSavings + totals.couponDiscount > 0 && <p className="rounded-md bg-success/10 px-3 py-2 text-xs font-medium text-success">You save {formatPrice(totals.productSavings + totals.couponDiscount)} on this order</p>}
      {remaining > 0 && totals.itemCount > 0 && totals.shipping > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Add {formatPrice(remaining)} more for free delivery</p>
          <Progress value={((totals.subtotal - totals.couponDiscount) / FREE_SHIPPING_THRESHOLD) * 100} label="Progress to free delivery" />
        </div>
      )}
    </div>
  );
}
