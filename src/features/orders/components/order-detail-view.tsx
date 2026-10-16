"use client";

import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";
import type { Order } from "@/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrdersStore } from "@/store/orders.store";
import { useHydrated } from "@/store/hydration.store";
import { OrderSummaryRows } from "@/features/cart/components/order-summary";
import { EmptyState } from "@/components/common/state-views";
import { ProductImage } from "@/components/common/product-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "./status-badge";
import { OrderTimeline } from "./order-timeline";
import { OrderReviewButton } from "@/features/reviews/components/order-review-button";

/** `reviewable`: the customer's own view — delivered items get a "Write a review" button (not shown to admins). */
export function OrderDetailCard({ order, backHref, backLabel, reviewable = false }: { order: Order; backHref: string; backLabel: string; reviewable?: boolean }) {
  const canReview = reviewable && order.status === "delivered";
  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> {backLabel}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order <span className="font-mono">{order.id}</span></h1>
          <p className="text-sm text-muted-foreground">Placed {formatDate(order.createdAt, { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tracking</CardTitle>
          <p className="text-sm text-muted-foreground">
            {order.status === "delivered" ? "Delivered" : <>Expected delivery by <strong className="text-foreground">{formatDate(order.expectedDelivery, { weekday: "short", day: "numeric", month: "short" })}</strong></>} · Status updates are simulated
          </p>
        </CardHeader>
        <CardContent><OrderTimeline order={order} /></CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {order.lines.map((l) => (
                <li key={`${l.productId}-${l.variantId}`} className="flex items-center gap-3 py-3">
                  <Link href={`/product/${l.productId}`} className="relative size-16 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-border"><ProductImage src={l.thumbnail} alt={l.title} sizes="64px" /></Link>
                  <span className="min-w-0 flex-1 text-sm">
                    <Link href={`/product/${l.productId}`} className="line-clamp-2 font-medium hover:underline">{l.title}</Link>
                    <span className="text-xs text-muted-foreground">{l.variantLabel ? `${l.variantLabel} · ` : ""}{l.quantity} × {formatPrice(l.unitPrice)}</span>
                    {canReview && <span className="mt-1.5 block"><OrderReviewButton productId={l.productId} title={l.title} /></span>}
                  </span>
                  <span className="text-sm font-semibold">{formatPrice(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card><CardContent className="pt-5"><OrderSummaryRows totals={order.totals} couponCode={order.couponCode} deliveryLabel={order.delivery.label} /></CardContent></Card>
          <Card>
            <CardContent className="space-y-3 pt-5 text-sm">
              <div><p className="font-semibold">Delivery address</p><p className="text-muted-foreground">{order.address.fullName} · {order.address.phone}<br />{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} {order.address.pincode}</p></div>
              <div><p className="font-semibold">Payment</p><p className="text-muted-foreground">{order.payment.label} · Ref {order.payment.reference}</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const hydrated = useHydrated();
  const { user } = useAuth();
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === orderId));
  if (!hydrated) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!order || order.userId !== user?.id) return <EmptyState icon={<PackageSearch className="size-7" />} title="Order not found" description="This order doesn't exist or belongs to another account." action={{ label: "Back to orders", href: "/account/orders" }} />;
  return <OrderDetailCard order={order} backHref="/account/orders" backLabel="All orders" reviewable />;
}
