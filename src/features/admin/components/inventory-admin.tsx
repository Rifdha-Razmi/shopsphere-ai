"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminStore } from "@/store/admin.store";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageHeader } from "./admin-shell";
import { StatCard } from "./bar-list";

function StockEditor({ id, stock }: { id: number; stock: number }) {
  const setStock = useAdminStore((s) => s.setStock);
  const [value, setValue] = useState(String(stock));
  const n = Number(value);
  const valid = value !== "" && Number.isInteger(n) && n >= 0 && n <= 100000;
  return (
    <form className="flex items-center justify-end gap-1" onSubmit={(e) => { e.preventDefault(); if (!valid) return; setStock(id, n); toast.success(`Stock updated to ${n}`); }}>
      <Input aria-label="Stock quantity" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="h-8 w-20" aria-invalid={!valid} />
      <Button size="sm" variant="outline" type="submit" disabled={!valid || n === stock}>Save</Button>
    </form>
  );
}

export function InventoryAdmin() {
  const { catalog } = useAdminData();
  const [filter, setFilter] = useState<"attention" | "all">("attention");
  const products = useMemo(() => [...catalog.products].filter((p) => filter === "all" || p.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock), [catalog.products, filter]);
  if (catalog.isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  const out = catalog.products.filter((p) => p.stock === 0).length;
  const low = catalog.products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
  const units = catalog.products.reduce((s, p) => s + p.stock, 0);

  return (
    <>
      <AdminPageHeader title="Inventory" scope="local" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Units in stock" value={units.toLocaleString("en-IN")} />
        <StatCard label="Low stock (≤ 10)" value={String(low)} />
        <StatCard label="Out of stock" value={String(out)} />
      </div>
      <div className="w-60"><NativeSelect aria-label="Inventory filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="attention">Needs attention</option><option value="all">All products</option></NativeSelect></div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Variants</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Stock</TableHead></TableRow></TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.title}</Link></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.variants.length ? p.variants.map((v) => `${Object.values(v.attributes).join(" ")}: ${v.stock}`).join(" · ") : "—"}</TableCell>
                <TableCell>{p.stock === 0 ? <Badge variant="destructive">Out of stock</Badge> : p.stock <= LOW_STOCK_THRESHOLD ? <Badge variant="warning">Low stock</Badge> : <Badge variant="success">Healthy</Badge>}</TableCell>
                <TableCell><StockEditor key={`${p.id}-${p.stock}`} id={p.id} stock={p.stock} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
