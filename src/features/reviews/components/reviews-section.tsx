"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Product, Review, ReviewSort } from "@/types";
import { sortReviews } from "@/services/reviews/reviews.service";
import { useProductReviews } from "../hooks/useProductReviews";
import { useReviewsStore } from "@/store/reviews.store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RatingStars } from "@/components/common/rating-stars";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { RatingSummary } from "./rating-summary";
import { cn } from "@/lib/cn";

const PAGE = 5;

function ReviewItem({ review, voterId }: { review: Review; voterId: string | null }) {
  const vote = useReviewsStore((s) => (voterId ? s.votes[`${voterId}:${review.id}`] : undefined));
  const castVote = useReviewsStore((s) => s.vote);
  const canVote = !!voterId && review.userId !== voterId;
  return (
    <li className="space-y-2 border-b py-5 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <RatingStars rating={review.rating} />
        {/* User-generated text is rendered as plain text — never as HTML (PRD §13). */}
        <h3 className="font-semibold">{review.title}</h3>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{review.body}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{review.authorName}</span>
        <span>{formatDate(review.createdAt)}</span>
        {review.verifiedPurchase && (
          <Badge variant="success">
            <BadgeCheck /> Verified purchase
          </Badge>
        )}
        {review.source === "local" && <Badge variant="local">Saved locally</Badge>}
      </div>
      <div className="flex items-center gap-2 pt-1 text-xs">
        <span className="text-muted-foreground">Helpful?</span>
        <button type="button" disabled={!canVote} onClick={() => voterId && castVote(voterId, review.id, "up")} aria-pressed={vote === "up"} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 hover:bg-muted disabled:opacity-60", vote === "up" && "border-primary bg-primary/5 text-primary")} aria-label={`Mark helpful (${review.helpful})`}>
          <ThumbsUp className="size-3.5" /> {review.helpful}
        </button>
        <button type="button" disabled={!canVote} onClick={() => voterId && castVote(voterId, review.id, "down")} aria-pressed={vote === "down"} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 hover:bg-muted disabled:opacity-60", vote === "down" && "border-destructive bg-destructive/5 text-destructive")} aria-label={`Mark not helpful (${review.notHelpful})`}>
          <ThumbsDown className="size-3.5" /> {review.notHelpful}
        </button>
        {!voterId && <span className="text-muted-foreground">Sign in to vote</span>}
      </div>
    </li>
  );
}

/**
 * Reviews module (MOD-10): summary, distribution, sortable list and voting.
 * Reviews are written from a delivered order (OrderReviewButton), not here.
 */
export function ReviewsSection({ product }: { product: Product }) {
  const { reviews, summary } = useProductReviews(product);
  const { user } = useAuth();
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE);

  const list = useMemo(() => sortReviews(starFilter ? reviews.filter((r) => r.rating === starFilter) : reviews, sort), [reviews, sort, starFilter]);

  return (
    <section aria-labelledby="reviews-heading" className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-5">
        <h2 id="reviews-heading" className="text-xl font-semibold tracking-tight">Ratings & reviews</h2>
        <RatingSummary summary={summary} onFilter={(s) => { setStarFilter((cur) => (cur === s ? null : s)); setVisible(PAGE); }} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {starFilter ? `Showing ${list.length} ${starFilter}-star reviews` : `${list.length} reviews`}
            {starFilter && (
              <button type="button" className="ml-2 font-medium text-primary hover:underline" onClick={() => setStarFilter(null)}>Show all</button>
            )}
          </p>
          <div className="w-52">
            <label htmlFor="review-sort" className="sr-only">Sort reviews</label>
            <NativeSelect id="review-sort" value={sort} onChange={(e) => setSort(e.target.value as ReviewSort)}>
              <option value="recent">Most recent</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
              <option value="helpful">Most helpful</option>
            </NativeSelect>
          </div>
        </div>
        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No reviews yet{starFilter ? " with this rating" : ""}.</p>
        ) : (
          <ul>
            {list.slice(0, visible).map((r) => (
              <ReviewItem key={r.id} review={r} voterId={user?.id ?? null} />
            ))}
          </ul>
        )}
        {visible < list.length && (
          <Button variant="outline" className="mt-4" onClick={() => setVisible((v) => v + PAGE)}>
            Show more reviews ({list.length - visible} more)
          </Button>
        )}
      </div>
    </section>
  );
}
