import type { RatingSummary as Summary } from "@/services/reviews/reviews.service";
import { RatingStars } from "@/components/common/rating-stars";

/** Average + 5→1 star distribution bar chart (MOD-10). */
export function RatingSummary({ summary, onFilter }: { summary: Summary; onFilter?: (stars: number) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <p className="text-5xl font-bold tracking-tight">{summary.count ? summary.average.toFixed(1) : "–"}</p>
        <div>
          <RatingStars rating={summary.average} size="md" />
          <p className="mt-1 text-sm text-muted-foreground">Based on {summary.count.toLocaleString("en-IN")} {summary.count === 1 ? "review" : "reviews"}</p>
        </div>
      </div>
      <figure>
        <figcaption className="sr-only">Rating distribution</figcaption>
        <ul className="space-y-1.5">
          {summary.distribution.map((d) => (
            <li key={d.stars}>
              <button type="button" disabled={!onFilter} onClick={() => onFilter?.(d.stars)} className="flex w-full items-center gap-3 text-sm disabled:cursor-default" aria-label={`${d.stars} star: ${d.count} reviews (${Math.round(d.share * 100)}%)`}>
                <span className="w-10 shrink-0 text-left text-muted-foreground">{d.stars} ★</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span className="block h-full rounded-full bg-amber-400" style={{ width: `${d.share * 100}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right text-xs text-muted-foreground" aria-hidden>{d.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </figure>
    </div>
  );
}
