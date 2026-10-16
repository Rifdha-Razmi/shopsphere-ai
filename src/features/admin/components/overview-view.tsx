"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useAdminData } from "../hooks/useAdminData";
import { useAnalyticsStore } from "@/store/analytics.store";
import { combine, seedCounters, summarize, SIMULATED } from "@/services/analytics/analytics.service";
import { STRATEGY_LABELS, ORDER_STATUSES } from "@/types";
import { LOW_STOCK_THRESHOLD, ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatCompact, formatDate, formatPercent, formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/features/orders/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/state-views";
import { AdminPageHeader } from "./admin-shell";
import { BarList, StatCard } from "./bar-list";

export function OverviewView() {
  const { catalog, orders, customers, usersQuery } = useAdminData();
  const counters = useAnalyticsStore((s) => s.counters);
  const analytics = useMemo(() => summarize(combine(seedCounters(), counters)), [counters]);

  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + o.totals.total, 0);
    const sales = new Map<number, { title: string; units: number; revenue: number }>();
    for (const o of orders) for (const l of o.lines) {
      const cur = sales.get(l.productId) ?? { title: l.title, units: 0, revenue: 0 };
      sales.set(l.productId, { title: l.title, units: cur.units + l.quantity, revenue: cur.revenue + l.unitPrice * l.quantity });
    }
    const topSelling = [...sales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
    const topRated = [...catalog.products].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount).slice(0, 5);
    const lowStock = catalog.products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock);
    const byStatus = ORDER_STATUSES.map((s) => ({ label: ORDER_STATUS_LABELS[s], value: orders.filter((o) => o.status === s).length }));
    return { revenue, topSelling, topRated, lowStock, byStatus };
  }, [orders, catalog.products]);

  if (catalog.isLoading) return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;
  if (catalog.isError) return <ErrorState title="Couldn't load catalogue data" onRetry={() => void catalog.refetch()} />;

  return (
    <>
      <AdminPageHeader title="Overview" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total products" value={catalog.products.length.toLocaleString("en-IN")} hint={`${catalog.all.length - catalog.products.length} archived`} />
        <StatCard label="Total orders" value={orders.length.toLocaleString("en-IN")} hint="Fixture + locally placed" />
        <StatCard label="Total customers" value={usersQuery.isPending ? "…" : customers.length.toLocaleString("en-IN")} hint="DummyJSON + local accounts" />
        <StatCard label="Revenue" value={formatPrice(stats.revenue)} hint="From simulated orders" badge={<Badge variant="warning">Simulated</Badge>} />
        <StatCard label="Conversion rate" value={formatPercent(SIMULATED.conversionRate, 1)} hint={`${formatCompact(SIMULATED.sessions)} sessions (simulated)`} badge={<Badge variant="warning">Simulated</Badge>} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2">Top products by revenue <Badge variant="warning">Simulated</Badge></CardTitle></CardHeader>
          <CardContent>
            {stats.topSelling.length ? <BarList caption="Top products by simulated revenue" items={stats.topSelling.map((t) => ({ label: t.title, value: t.revenue, hint: `${t.units} units` }))} format={formatPrice} /> : <p className="text-sm text-muted-foreground">No orders yet.</p>}
            <p className="mt-5 mb-2 text-sm font-semibold">Top rated</p>
            <ul className="divide-y text-sm">
              {stats.topRated.map((p) => <li key={p.id} className="flex justify-between gap-3 py-2"><Link href={`/admin/products/${p.id}`} className="truncate hover:underline">{p.title}</Link><span className="shrink-0 tabular-nums">{p.rating.toFixed(2)} ★</span></li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-destructive" aria-hidden /> Low-stock alerts <Badge variant="destructive" aria-label={`${stats.lowStock.length} products at or below ${LOW_STOCK_THRESHOLD} units`}>{stats.lowStock.length}</Badge></CardTitle></CardHeader>
          <CardContent>
            <ul className="max-h-80 divide-y overflow-y-auto text-sm">
              {stats.lowStock.slice(0, 20).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/products/${p.id}`} className="truncate hover:underline">{p.title}</Link>
                  <Badge variant={p.stock === 0 ? "destructive" : "warning"}>{p.stock === 0 ? "Out" : `${p.stock} left`}</Badge>
                </li>
              ))}
            </ul>
            <Link href="/admin/inventory" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Manage inventory →</Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">Recommendation engine <Badge variant="local" className="text-xs font-medium">Local Analytics</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xl font-bold tabular-nums">{formatCompact(analytics.impressions)}</p><p className="text-xs text-muted-foreground">Impressions</p></div>
              <div><p className="text-xl font-bold tabular-nums">{formatPercent(analytics.ctr, 1)}</p><p className="text-xs text-muted-foreground">CTR</p></div>
              <div><p className="text-xl font-bold tabular-nums">{formatPercent(analytics.conversion, 1)}</p><p className="text-xs text-muted-foreground">Rec → cart</p></div>
            </div>
            <BarList caption="Clicks by strategy" items={analytics.byStrategy.slice(0, 5).map((r) => ({ label: STRATEGY_LABELS[r.strategy], value: r.clicks }))} />
            <Link href="/admin/analytics" className="inline-block text-sm font-medium text-primary hover:underline">Full analytics →</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Orders by status</CardTitle></CardHeader>
          <CardContent><BarList caption="Order count by status" items={stats.byStatus} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {[...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/admin/orders/${o.id}`} className="min-w-0 hover:underline"><span className="block font-mono text-xs">{o.id}</span><span className="block truncate text-xs text-muted-foreground">{o.customerName} · {formatDate(o.createdAt)}</span></Link>
                  <OrderStatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
