"use client";

import { useState } from "react";
import { PenLine, Star } from "lucide-react";
import { toast } from "sonner";
import type { ProductId } from "@/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useReviewsStore } from "@/store/reviews.store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReviewForm, toastReviewSaved } from "./review-form";

/**
 * Reviews are written from a delivered order (PRD §5.10 / §4.3: registered
 * customers review what they bought), so every new review is a verified
 * purchase. If the customer already reviewed the product, this edits it.
 */
export function OrderReviewButton({ productId, title }: { productId: ProductId; title: string }) {
  const { user } = useAuth();
  const existing = useReviewsStore((s) => (user ? s.local.find((r) => r.userId === user.id && r.productId === productId) : undefined));
  const submit = useReviewsStore((s) => s.submit);
  const update = useReviewsStore((s) => s.update);
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <>
      <Button size="sm" variant={existing ? "ghost" : "outline"} onClick={() => setOpen(true)} aria-label={`${existing ? "Edit review" : "Write a review"} for ${title}`}>
        {existing ? <PenLine /> : <Star />} {existing ? "Edit review" : "Write a review"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{existing ? "Edit your review" : "Write a review"}</DialogTitle>
            <DialogDescription className="line-clamp-1">{title}</DialogDescription>
          </DialogHeader>
          <ReviewForm
            key={existing?.id ?? "new"}
            defaultValues={existing ? { rating: existing.rating, title: existing.title, body: existing.body } : undefined}
            submitLabel={existing ? "Save changes" : "Submit review"}
            onCancel={() => setOpen(false)}
            onSubmit={(values) => {
              if (existing) {
                update(existing.id, values);
                toast.success("Review updated");
              } else {
                const review = submit({ ...values, productId, userId: user.id, authorName: `${user.firstName} ${user.lastName.charAt(0)}.`.trim() });
                toastReviewSaved(review, true);
              }
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
