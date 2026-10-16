import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function RatingStars({ rating, size = "sm", className }: { rating: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const px = size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <span key={i} className={cn("relative inline-block", px)} aria-hidden>
            <Star className={cn("absolute inset-0 text-muted-foreground/35", px)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("fill-amber-400 text-amber-400", px)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Compact "4.3 ★" pill used on product cards. */
export function RatingPill({ rating, count }: { rating: number; count?: number }) {
  const tone = rating >= 4 ? "bg-rating" : rating >= 3 ? "bg-amber-500" : "bg-destructive";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold text-white", tone)}>
        {rating.toFixed(1)}
        <Star className="size-3 fill-current" aria-hidden />
      </span>
      {count !== undefined && <span>({count.toLocaleString("en-IN")})</span>}
      <span className="sr-only">Rated {rating.toFixed(1)} out of 5{count !== undefined ? ` from ${count} reviews` : ""}</span>
    </span>
  );
}
