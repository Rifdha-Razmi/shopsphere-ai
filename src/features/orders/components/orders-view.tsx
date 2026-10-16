"use client";

import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import type { Order } from "@/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOrdersStore } from "@/store/orders.store";
import { EmptyState } from "@/components/common/state-views";
import { ProductImage } from "@/components/common/product-image";
import { formatDate, formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "./status-badge";
import { useMemo } from "react";

export function OrdersView() {
  const { user } = useAuth();
  const all = useOrdersStore((s) => s.orders);
  const orders = useMemo<Order[]>(() => all.filter((o) => o.userId === user?.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [all, user?.id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      {orders.length === 0 ? (
        <EmptyState icon={<Package className="size-7" />} title="No orders yet" description="When you place your first order it'll show up here with live tracking." action={{ label: "Start shopping", href: "/products" }} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="block rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-mono font-semibold">{o.id}</span>
                    <span className="text-muted-foreground"> · {formatDate(o.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-3"><OrderStatusBadge status={o.status} /><span className="font-semibold">{formatPrice(o.totals.total)}</span><ChevronRight className="size-4 text-muted-foreground" aria-hidden /></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {o.lines.slice(0, 4).map((l) => (
                    <span key={`${l.productId}-${l.variantId}`} className="relative size-12 overflow-hidden rounded-md bg-white ring-1 ring-border"><ProductImage src={l.thumbnail} alt={l.title} sizes="48px" /></span>
                  ))}
                  <span className="ml-1 line-clamp-1 text-sm text-muted-foreground">{o.lines.map((l) => l.title).join(", ")}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
