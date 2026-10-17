"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useReviewsStore } from "@/store/reviews.store";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { EmptyState } from "@/components/common/state-views";
import { RatingStars } from "@/components/common/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export function MyReviewsView() {
  const { user } = useAuth();
  const all = useReviewsStore((s) => s.local);
  const update = useReviewsStore((s) => s.update);
  const remove = useReviewsStore((s) => s.remove);
  const hidden = useReviewsStore((s) => s.hidden);
  const { byId } = useCatalog();
  const [editing, setEditing] = useState<string | null>(null);
  const mine = all.filter((r) => r.userId === user?.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My reviews</h1>
      {mine.length === 0 ? (
        <EmptyState icon={<MessageSquare className="size-7" />} title="You haven't written any reviews" description="Open a delivered order and tap “Write a review” on any item." action={{ label: "View my orders", href: "/account/orders" }} />
      ) : (
        <ul className="space-y-3">
          {mine.map((r) => (
            <li key={r.id} className="rounded-xl border bg-card p-4">
              <Link href={`/product/${r.productId}#reviews`} className="text-sm font-medium text-primary hover:underline">{byId.get(r.productId)?.title ?? `Product #${r.productId}`}</Link>
              {editing === r.id ? (
                <div className="mt-3">
                  <ReviewForm
                    defaultValues={{ rating: r.rating, title: r.title, body: r.body }}
                    submitLabel="Save changes"
                    onCancel={() => setEditing(null)}
                    onSubmit={(v) => {
                      update(r.id, v);
                      setEditing(null);
                      toast.success("Review updated");
                    }}
                  />
                </div>
              ) : (
                <div className="mt-2 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2"><RatingStars rating={r.rating} /><span className="font-semibold">{r.title}</span>{hidden.includes(r.id) && <Badge variant="warning">Hidden by admin</Badge>}</div>
                  <p className="text-sm whitespace-pre-line text-foreground/90">{r.body}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(r.id)}><Pencil /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { remove(r.id); toast.message("Review deleted"); }}><Trash2 /> Delete</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
