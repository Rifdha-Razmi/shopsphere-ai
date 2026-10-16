"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { useAdminData } from "../hooks/useAdminData";
import { useAdminStore } from "@/store/admin.store";
import { useCategories } from "@/features/products/hooks/useCategories";
import { paginate } from "@/services/catalog/filter";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "@/components/common/product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/state-views";
import { Pagination } from "@/features/products/components/pagination";
import { AdminPageHeader } from "./admin-shell";

const PAGE = 15;

export function ProductsAdmin() {
  const { catalog, referencedIds } = useAdminData();
  const { categories, nameOf } = useCategories();
  const { deleteProduct, archiveProduct, restoreProduct } = useAdminStore.getState();
  const edits = useAdminStore((s) => s.edits);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [stock, setStock] = useState<"all" | "low" | "out" | "archived">("all");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<Product | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.all.filter((p) => {
      if (needle && !`${p.title} ${p.brand} ${p.sku} ${p.id}`.toLowerCase().includes(needle)) return false;
      if (cat && p.category !== cat) return false;
      if (stock === "archived") return !!p.archived;
      if (stock === "low" && !(p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)) return false;
      if (stock === "out" && p.stock > 0) return false;
      return true;
    });
  }, [catalog.all, q, cat, stock]);
  const { items, page: current, totalPages } = paginate(rows, page, PAGE);

  if (catalog.isLoading) return <Skeleton className="h-[480px] w-full rounded-xl" />;
  if (catalog.isError) return <ErrorState title="Couldn't load products" onRetry={() => void catalog.refetch()} />;

  const referenced = confirm ? referencedIds.has(confirm.id) : false;

  return (
    <>
      <AdminPageHeader title="Products" scope="local" description={`${catalog.all.length} products`} actions={<Button asChild><Link href="/admin/products/new"><Plus /> Add product</Link></Button>} />
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search products" placeholder="Search by title, brand, SKU or ID" className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div className="w-52"><NativeSelect aria-label="Filter by category" value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</NativeSelect></div>
        <div className="w-44"><NativeSelect aria-label="Filter by stock" value={stock} onChange={(e) => { setStock(e.target.value as typeof stock); setPage(1); }}><option value="all">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="archived">Archived</option></NativeSelect></div>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Rating</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No products match these filters.</TableCell></TableRow>}
            {items.map((p) => (
              <TableRow key={p.id} className={p.archived ? "opacity-60" : undefined}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded bg-white ring-1 ring-border"><ProductImage src={p.thumbnail} alt="" sizes="40px" /></span>
                    <div className="min-w-0">
                      <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:underline">{p.title}</Link>
                      <p className="text-xs text-muted-foreground">#{p.id} · {p.brand}{p.isLocal && " · "}{p.isLocal && <Badge variant="local">Local</Badge>}{edits[p.id] && <Badge variant="local" className="ml-1">Edited</Badge>}{p.archived && <Badge variant="secondary" className="ml-1">Archived</Badge>}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{nameOf(p.category)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(p.price)}</TableCell>
                <TableCell className="text-right">{p.stock === 0 ? <Badge variant="destructive">0</Badge> : p.stock <= LOW_STOCK_THRESHOLD ? <Badge variant="warning">{p.stock}</Badge> : <span className="tabular-nums">{p.stock}</span>}</TableCell>
                <TableCell className="text-right tabular-nums">{p.rating.toFixed(1)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon-sm" variant="ghost" asChild><Link href={`/admin/products/${p.id}`} aria-label={`Edit ${p.title}`}><Pencil /></Link></Button>
                    {p.archived ? (
                      <Button size="icon-sm" variant="ghost" onClick={() => { restoreProduct(p.id); toast.success("Product restored"); }} aria-label={`Restore ${p.title}`}><ArchiveRestore /></Button>
                    ) : (
                      <Button size="icon-sm" variant="ghost" onClick={() => setConfirm(p)} aria-label={`Delete ${p.title}`}><Trash2 /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={current} totalPages={totalPages} onChange={setPage} />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{referenced ? "Archive instead of delete?" : "Delete product?"}</DialogTitle>
            <DialogDescription>
              {referenced
                ? `“${confirm?.title}” appears in existing orders, so it can't be deleted without breaking order history. Archiving hides it from the storefront but keeps it for orders.`
                : `“${confirm?.title}” will be removed from the storefront.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            {referenced ? (
              <Button onClick={() => { archiveProduct(confirm!.id); toast.success("Product archived (kept for order history)"); setConfirm(null); }}><Archive /> Archive product</Button>
            ) : (
              <Button variant="destructive" onClick={() => { deleteProduct(confirm!.id); toast.success("Product deleted"); setConfirm(null); }}><Trash2 /> Delete</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
