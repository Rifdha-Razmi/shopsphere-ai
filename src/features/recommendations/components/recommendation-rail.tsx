"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { RecommendationRequest, RecommendationStrategy } from "@/types";
import type { ServiceOptions } from "@/services/recommendations/recommendation.service";
import { useRecommendations } from "@/features/recommendations/hooks/useRecommendations";
import { ProductCard, ProductCardSkeleton } from "@/features/products/components/product-card";
import { useAnalyticsStore } from "@/store/analytics.store";
import { cn } from "@/lib/cn";

interface RecommendationRailProps {
  request: RecommendationRequest;
  options?: ServiceOptions;
  /** Optional heading override; by default the signal-transparent title from the service is used. */
  title?: string;
  className?: string;
  enabled?: boolean;
  /** Optional "View all" destination shown next to the heading. */
  href?: string;
}

/**
 * Presentational rail. All scoring happens behind `useRecommendations()`;
 * this component only renders and reports impressions/clicks for analytics.
 * Empty or failed rails render nothing (edge case 16) unless the service
 * returned a Trending fallback.
 */
export function RecommendationRail({ request, options, title, className, enabled = true, href }: RecommendationRailProps) {
  const { result, isLoading, isError } = useRecommendations(request, options, enabled);
  const headingId = useId();
  const scroller = useRef<HTMLUListElement>(null);
  const root = useRef<HTMLElement>(null);
  const recordImpression = useAnalyticsStore((s) => s.recordImpression);
  const recordClick = useAnalyticsStore((s) => s.recordClick);
  const strategy: RecommendationStrategy = result?.strategy ?? request.strategy;
  const itemCount = result?.items.length ?? 0;
  const impressionKey = result ? `${result.strategy}:${result.items.map((i) => i.product.id).join(",")}` : "";

  useEffect(() => {
    const el = root.current;
    if (!el || !itemCount || !impressionKey) return;
    let counted = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!counted && entries.some((e) => e.isIntersecting)) {
          counted = true;
          recordImpression(strategy, itemCount);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [impressionKey, itemCount, strategy, recordImpression]);

  if (!enabled) return null;
  if (isLoading) {
    return (
      <section className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading recommendations">
        <div className="skeleton-shimmer h-6 w-56 rounded" />
        <div className="scrollbar-none flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="w-40 shrink-0 sm:w-48">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (isError || !result || result.items.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <section ref={root} aria-labelledby={headingId} className={cn("space-y-3", className)} data-strategy={result.strategy} data-testid={`rail-${result.strategy}`}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
            {result.isFallback ? null : <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />}
            <span className="truncate">{title ?? result.title}</span>
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {href && <Link href={href} className="mr-2 text-sm font-medium text-primary hover:underline">View all</Link>}
          <button type="button" onClick={() => scrollBy(-1)} className="hidden rounded-full border bg-card p-2 hover:bg-muted sm:block" aria-label={`Scroll ${title ?? result.title} left`}>
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => scrollBy(1)} className="hidden rounded-full border bg-card p-2 hover:bg-muted sm:block" aria-label={`Scroll ${title ?? result.title} right`}>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <ul ref={scroller} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {result.items.map((item) => (
          <li key={item.product.id} className="w-40 shrink-0 snap-start sm:w-48 xl:w-52">
            <ProductCard product={item.product} reason={item.reason} compact onNavigate={() => recordClick(result.strategy, item.product.id)} showCompare={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
