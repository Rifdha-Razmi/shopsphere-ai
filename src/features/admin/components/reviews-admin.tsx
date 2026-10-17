"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Review } from "@/types";
import { useAdminData } from "../hooks/useAdminData";
import { allReviewsFor } from "@/features/reviews/hooks/useProductReviews";
import { isVerified } from "@/services/reviews/reviews.service";
import { paginate } from "@/services/catalog/filter";
import { useReviewsStore } from "@/store/reviews.store";
import { RatingStars } from "@/components/common/rating-stars";
import { ErrorState } from "@/components/common/state-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/features/products/components/pagination";
import { formatDate } from "@/lib/format";
import { AdminPageHeader } from "./admin-shell";

type StatusFilter = "all" | "visible" | "hidden";
type SourceFilter = "all" | "customer" | "imported";

interface Row extends Review {
  productTitle: string;
  hidden: boolean;
}

/**
 * Review moderation (PRD §4.3: administrators moderate reviews). Admins can
 * hide any review from the store (and show it again) and delete reviews
 * written by customers on this site. Imported DummyJSON/fixture reviews can
 * only be hidden, since they belong to the source data.
 */
export function ReviewsAdmin() {
  const { catalog, orders } = useAdminData();
  const local = useReviewsStore((s) => s.local);
  const hiddenIds = useReviewsStore((s) => s.hidden);
  const setHidden = useReviewsStore((s) => s.setHidden);
  const remove = useReviewsStore((s) => s.remove);

  const [q, setQ] = useState("");
  const [rating, setRating] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<Row | null>(null);

  const all = useMemo<Row[]>(() => {
    const hidden = new Set(hiddenIds);
    return catalog.all
      .flatMap((p) => allReviewsFor(p, local).map((r) => ({ ...r, productTitle: p.title, verifiedPurchase: isVerified(r, orders), hidden: hidden.has(r.id) })))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [catalog.all, local, hiddenIds, orders]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (needle && !`${r.productTitle} ${r.authorName} ${r.title} ${r.body}`.toLowerCase().includes(needle)) return false;
      if (rating && r.rating !== Number(rating)) return false;
      if (status === "visible" && r.hidden) return false;
      if (status === "hidden" && !r.hidden) return false;
      if (source === "customer" && r.source !== "local") return false;
      if (source === "imported" && r.source === "local") return false;
      return true;
    });
  }, [all, q, rating, status, source]);

  const { items, page: current, totalPages } = paginate(rows, page, 20);
  const hiddenCount = all.filter((r) => r.hidden).length;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  if (catalog.isLoading) return <Skeleton className="h-[480px] w-full rounded-xl" />;
  if (catalog.isError) return <ErrorState title="Couldn't load reviews" onRetry={() => void catalog.refetch()} />;

  return (
    <>
      <AdminPageHeader title="Reviews" scope="local" description={`${all.length} reviews · ${hiddenCount} hidden`} />

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search reviews" placeholder="Search by product, customer or text" className="pl-9" value={q} onChange={(e) => reset(setQ)(e.target.value)} />
        </div>
        <div className="w-36">
          <NativeSelect aria-label="Filter by rating" value={rating} onChange={(e) => reset(setRating)(e.target.value)}>
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
          </NativeSelect>
        </div>
        <div className="w-36">
          <NativeSelect aria-label="Filter by status" value={status} onChange={(e) => reset(setStatus)(e.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </NativeSelect>
        </div>
        <div className="w-40">
          <NativeSelect aria-label="Filter by source" value={source} onChange={(e) => reset(setSource)(e.target.value as SourceFilter)}>
            <option value="all">All sources</option>
            <option value="customer">Customer reviews</option>
            <option value="imported">Imported</option>
          </NativeSelect>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No reviews match these filters.</TableCell></TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id} className={r.hidden ? "opacity-60" : undefined}>
                  <TableCell className="max-w-48">
                    <Link href={`/product/${r.productId}#reviews`} className="line-clamp-2 font-medium hover:text-primary hover:underline">{r.productTitle}</Link>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <RatingStars rating={r.rating} />
                    <p className="mt-1 font-medium">{r.title}</p>
                    <p className="line-clamp-2 text-xs whitespace-normal text-muted-foreground">{r.body}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.authorName}
                    <span className="mt-0.5 flex gap-1">
                      {r.source === "local" ? <Badge variant="secondary">Customer</Badge> : <Badge variant="outline">Imported</Badge>}
                      {r.verifiedPurchase && <Badge variant="success">Verified</Badge>}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  <TableCell>{r.hidden ? <Badge variant="warning">Hidden</Badge> : <Badge variant="success">Visible</Badge>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {r.hidden ? (
                      <Button size="sm" variant="outline" onClick={() => { setHidden(r.id, false); toast.success("Review is visible again"); }} aria-label={`Show review by ${r.authorName}`}>
                        <Eye /> Show
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setHidden(r.id, true); toast.success("Review hidden from the store"); }} aria-label={`Hide review by ${r.authorName}`}>
                        <EyeOff /> Hide
                      </Button>
                    )}
                    {r.source === "local" && (
                      <Button size="icon-sm" variant="ghost" className="ml-1 text-destructive hover:text-destructive" onClick={() => setConfirm(r)} aria-label={`Delete review by ${r.authorName}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination page={current} totalPages={totalPages} onChange={setPage} />

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this review?</DialogTitle>
            <DialogDescription>
              {confirm ? `“${confirm.title}” by ${confirm.authorName} will be permanently removed.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (confirm) remove(confirm.id); toast.success("Review deleted"); setConfirm(null); }}>
              <Trash2 /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
