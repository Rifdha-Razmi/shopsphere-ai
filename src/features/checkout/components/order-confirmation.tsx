"use client";

import Link from "next/link";
import { CheckCircle2, PackageSearch } from "lucide-react";
import { useOrdersStore } from "@/store/orders.store";
import { useHydrated } from "@/store/hydration.store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { OrderSummaryRows } from "@/features/cart/components/order-summary";
import { RecommendationRail } from "@/features/recommendations/components/recommendation-rail";
import { EmptyState } from "@/components/common/state-views";
import { ProductImage } from "@/components/common/product-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/format";

export function OrderConfirmation({ orderId }: { orderId: string }) {
  const hydrated = useHydrated();
  const { user } = useAuth();
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === orderId));
  if (!hydrated) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!order || order.userId !== user?.id) {
    return <EmptyState icon={<PackageSearch className="size-7" />} title="Order not found" description="We couldn't find this order in your account." action={{ label: "View my orders", href: "/account/orders" }} />;
  }
  return (
    <div className="space-y-10">
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center gap-2 bg-success/10 px-6 py-8 text-center">
          <CheckCircle2 className="size-12 text-success" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight">Thank you! Your order is placed.</h1>
          <p className="text-sm text-muted-foreground">Order ID <span className="font-mono font-semibold text-foreground">{order.id}</span> · Payment ref {order.payment.reference} (test mode)</p>
          <p className="text-sm">Expected delivery by <strong>{formatDate(order.expectedDelivery, { weekday: "long", day: "numeric", month: "long" })}</strong></p>
        </div>
        <CardContent className="grid grid-cols-1 gap-8 p-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <h2 className="font-semibold">Items</h2>
            <ul className="divide-y rounded-lg border">
              {order.lines.map((l) => (
                <li key={`${l.productId}-${l.variantId}`} className="flex items-center gap-3 p-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded bg-white ring-1 ring-border"><ProductImage src={l.thumbnail} alt={l.title} sizes="56px" /></span>
                  <span className="min-w-0 flex-1 text-sm"><span className="line-clamp-1 font-medium">{l.title}</span><span className="text-xs text-muted-foreground">{l.variantLabel ? `${l.variantLabel} · ` : ""}Qty {l.quantity}</span></span>
                  <span className="text-sm font-semibold">{formatPrice(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="text-sm">
              <p className="font-semibold">Shipping to</p>
              <p className="text-muted-foreground">{order.address.fullName}, {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} {order.address.pincode}</p>
            </div>
          </div>
          <div className="space-y-4">
            <OrderSummaryRows totals={order.totals} couponCode={order.couponCode} deliveryLabel={order.delivery.cost ? order.delivery.label : undefined} />
            <Button className="w-full" asChild><Link href={`/account/orders/${order.id}`}>Track this order</Link></Button>
            <Button className="w-full" variant="outline" asChild><Link href="/products">Continue shopping</Link></Button>
          </div>
        </CardContent>
      </Card>
      <RecommendationRail request={{ strategy: "frequently-bought", productId: order.lines[0].productId, limit: 10, exclude: order.lines.map((l) => l.productId) }} title="Complete the set" />
    </div>
  );
}
