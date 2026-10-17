"use client";

import { useId, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types";
import { ProductCard, ProductCardSkeleton } from "./product-card";

/** Horizontal product rail for merchandised (non-recommendation) lists, e.g. Featured. */
export function ProductRail({ title, subtitle, products, loading, href }: { title: string; subtitle?: string; products: Product[]; loading?: boolean; href?: string }) {
  const id = useId();
  const ref = useRef<HTMLUListElement>(null);
  if (!loading && products.length === 0) return null;
  const scrollBy = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {href && <Link href={href} className="mr-2 text-sm font-medium text-primary hover:underline">View all</Link>}
          <button type="button" onClick={() => scrollBy(-1)} className="hidden rounded-full border bg-card p-2 hover:bg-muted sm:block" aria-label={`Scroll ${title} left`}><ChevronLeft className="size-4" /></button>
          <button type="button" onClick={() => scrollBy(1)} className="hidden rounded-full border bg-card p-2 hover:bg-muted sm:block" aria-label={`Scroll ${title} right`}><ChevronRight className="size-4" /></button>
        </div>
      </div>
      <ul ref={ref} className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className="w-40 shrink-0 sm:w-48 xl:w-52"><ProductCardSkeleton /></li>)
          : products.map((p, i) => (
              <li key={p.id} className="w-40 shrink-0 snap-start sm:w-48 xl:w-52">
                <ProductCard product={p} compact showCompare={false} priority={i < 2} />
              </li>
            ))}
      </ul>
    </section>
  );
}
