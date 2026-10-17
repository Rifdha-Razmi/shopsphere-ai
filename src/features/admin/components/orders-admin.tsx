"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FastForward } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUSES, type OrderStatus } from "@/types";
import { useAdminData } from "../hooks/useAdminData";
import { useOrdersStore } from "@/store/orders.store";
import { nextStatus } from "@/services/orders/orders.service";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/features/orders/components/status-badge";
import { OrderDetailCard } from "@/features/orders/components/order-detail-view";
import { EmptyState } from "@/components/common/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/store/hydration.store";
import { AdminPageHeader } from "./admin-shell";

export function OrdersAdmin() {
  const { orders } = useAdminData();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [customer, setCustomer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const c = customer.trim().toLowerCase();
    const fromT = from ? Date.parse(`${from}T00:00:00`) : -Infinity;
    const toT = to ? Date.parse(`${to}T23:59:59`) : Infinity;
    const [lo, hi] = fromT <= toT ? [fromT, toT] : [toT, fromT]; // auto-swap inverted ranges
    return orders
      .filter((o) => (!status || o.status === status) && (!c || `${o.customerName} ${o.customerEmail} ${o.id}`.toLowerCase().includes(c)) && Date.parse(o.createdAt) >= lo && Date.parse(o.createdAt) <= hi)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [orders, status, customer, from, to]);

  return (
    <>
      <AdminPageHeader title="Orders" scope="local" description={`${orders.length} orders`} />
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1"><Label htmlFor="of-status" className="text-xs">Status</Label><NativeSelect id="of-status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}><option value="">All statuses</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}</NativeSelect></div>
        <div className="grid gap-1"><Label htmlFor="of-customer" className="text-xs">Customer / order ID</Label><Input id="of-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Name, email or ID" /></div>
        <div className="grid gap-1"><Label htmlFor="of-from" className="text-xs">From</Label><Input id="of-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="grid gap-1"><Label htmlFor="of-to" className="text-xs">To</Label><Input id="of-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {rows.length === 0 ? <EmptyState title="No orders match these filters" action={{ label: "Clear filters", onClick: () => { setStatus(""); setCustomer(""); setFrom(""); setTo(""); } }} /> : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell><span className="block">{o.customerName}</span><span className="block text-xs text-muted-foreground">{o.customerEmail}</span></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(o.createdAt)}</TableCell>
                  <TableCell>{o.totals.itemCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(o.totals.total)}</TableCell>
                  <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                  <TableCell><Button size="icon-sm" variant="ghost" asChild><Link href={`/admin/orders/${o.id}`} aria-label={`Open order ${o.id}`}><ChevronRight /></Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const hydrated = useHydrated();
  const order = useOrdersStore((s) => s.orders.find((o) => o.id === orderId));
  const advance = useOrdersStore((s) => s.advance);
  const autoProgress = useOrdersStore((s) => s.autoProgress);
  const setAutoProgress = useOrdersStore((s) => s.setAutoProgress);
  if (!hydrated) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!order) return <EmptyState title="Order not found" action={{ label: "Back to orders", href: "/admin/orders" }} />;
  const next = nextStatus(order.status);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fulfilment controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <Button disabled={!next} onClick={() => { advance(order.id); toast.success(`Order moved to ${ORDER_STATUS_LABELS[next!]}`); }}>
            <FastForward /> {next ? `Advance to “${ORDER_STATUS_LABELS[next]}”` : "Order delivered"}
          </Button>
          <div className="flex items-center gap-2">
            <Switch id="auto-progress" checked={autoProgress} onCheckedChange={setAutoProgress} />
            <Label htmlFor="auto-progress" className="text-sm font-normal">Auto-advance new orders over time (simulated clock)</Label>
          </div>
        </CardContent>
      </Card>
      <OrderDetailCard order={order} backHref="/admin/orders" backLabel="All orders" />
    </div>
  );
}
