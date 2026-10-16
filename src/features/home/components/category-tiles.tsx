"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useCategories } from "@/features/products/hooks/useCategories";
import { ProductImage } from "@/components/common/product-image";

/** Photo category tiles — the homepage's category navigation (PRD §5.1). */
export function CategoryTiles() {
  const { categories, isLoading } = useCategories();
  const { products } = useCatalog();
  const thumbs = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of [...products].sort((a, b) => b.rating - a.rating)) if (!map.has(p.category)) map.set(p.category, p.thumbnail);
    return map;
  }, [products]);

  return (
    <section aria-labelledby="shop-by-category" className="space-y-3">
      <h2 id="shop-by-category" className="text-lg font-semibold tracking-tight sm:text-xl">Shop by category</h2>
      <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0 md:grid-cols-8 xl:grid-cols-12">
        {isLoading
          ? Array.from({ length: 12 }, (_, i) => <li key={i} className="skeleton-shimmer h-28 w-24 shrink-0 rounded-xl sm:w-auto" />)
          : categories.map((c) => (
              <li key={c.slug} className="w-24 shrink-0 sm:w-auto">
                <Link href={`/category/${c.slug}`} className="group flex h-full flex-col items-center gap-2 rounded-xl border bg-card p-2.5 text-center transition hover:border-primary/40 hover:shadow-sm">
                  <span className="relative size-16 overflow-hidden rounded-full bg-white ring-1 ring-border transition group-hover:ring-primary/40 lg:size-20">
                    <ProductImage src={thumbs.get(c.slug)} alt="" sizes="80px" />
                  </span>
                  <span className="line-clamp-2 text-xs leading-tight font-medium group-hover:text-primary">{c.name}</span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}
