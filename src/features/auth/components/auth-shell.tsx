"use client";

import { useMemo } from "react";
import { BadgeCheck, Sparkles, Truck } from "lucide-react";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { ProductImage } from "@/components/common/product-image";
import { cn } from "@/lib/cn";

const PERKS = [
  { icon: Sparkles, label: "Picks made for you" },
  { icon: Truck, label: "Free delivery over ₹999" },
  { icon: BadgeCheck, label: "Easy 7-day returns" },
];

/** A few top-rated products from different categories for the brand panel. */
function useShowcase(count = 4) {
  const { products } = useCatalog();
  return useMemo(() => {
    const seen = new Set<string>();
    const picks = [];
    for (const p of [...products].filter((p) => p.stock > 0).sort((a, b) => b.rating - a.rating)) {
      if (seen.has(p.category)) continue;
      seen.add(p.category);
      picks.push(p);
      if (picks.length === count) break;
    }
    return picks;
  }, [products, count]);
}

/**
 * Split layout shared by Sign in and Create account: a brand panel with real
 * products on the left (laptop and up) and the form card on the right.
 */
export function AuthShell({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  const showcase = useShowcase();

  return (
    <div className="container-page flex justify-center py-8 sm:py-12">
      <div className={cn("grid w-full overflow-hidden rounded-3xl border bg-card shadow-xl shadow-primary/5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]", wide ? "max-w-6xl" : "max-w-5xl")}>
        <aside className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-[linear-gradient(140deg,oklch(0.33_0.15_275),oklch(0.45_0.2_285)_55%,oklch(0.55_0.2_305))] p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full border-[24px] border-white/10" aria-hidden />

          <div className="relative space-y-3">
            <p className="text-sm font-semibold tracking-wide text-white/80 uppercase">ShopSphere AI</p>
            <p className="text-4xl leading-tight font-extrabold tracking-tight text-balance">Shopping that knows what you love.</p>
          </div>

          <ul className="relative mx-auto grid w-full max-w-sm grid-cols-2 gap-4" aria-hidden>
            {(showcase.length ? showcase : Array.from({ length: 4 }, () => null)).map((p, i) => (
              <li key={p?.id ?? i} className={cn("relative aspect-square overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5", i % 2 === 1 && "translate-y-6")}>
                {p ? <ProductImage src={p.thumbnail} alt="" sizes="200px" className="p-4" /> : <span className="skeleton-shimmer block size-full" />}
              </li>
            ))}
          </ul>

          <ul className="relative flex flex-wrap gap-2 pt-4">
            {PERKS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <Icon className="size-3.5" aria-hidden /> {label}
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <h1 className="mb-6 text-3xl font-bold tracking-tight">{title}</h1>
          {children}
        </section>
      </div>
    </div>
  );
}
