"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { ProductImage } from "@/components/common/product-image";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: { label: string; href: string };
  products: Product[];
  showDiscount?: boolean;
  /** Background + accent classes for this slide. */
  theme: { bg: string; eyebrow: string; button: string };
}

const AUTOPLAY_MS = 6000;
/** Must match the track's `duration-700` class. */
const SLIDE_MS = 700;

function useSlides(): Slide[] {
  const { products } = useCatalog();
  return useMemo(() => {
    const inStock = products.filter((p) => p.stock > 0);
    const top = (list: Product[], by: (p: Product) => number) => [...list].sort((a, b) => by(b) - by(a)).slice(0, 3);
    const fromPrice = (list: Product[]) => (list.length ? formatPrice(Math.min(...list.map((p) => p.price))) : null);

    const deals = top(inStock.filter((p) => p.rating >= 4 && p.price >= 999 && p.category !== "groceries"), (p) => p.discountPercentage);
    const maxOff = Math.floor(Math.max(0, ...inStock.map((p) => p.discountPercentage)) / 5) * 5;
    const phones = inStock.filter((p) => p.category === "smartphones");
    const beauty = inStock.filter((p) => p.category === "fragrances" || p.category === "beauty");

    return [
      {
        id: "deals",
        eyebrow: "Mega Savings Week",
        title: maxOff > 0 ? `Up to ${maxOff}% off top-rated picks` : "Big savings on top-rated picks",
        text: "Limited-time prices across electronics, fashion and home.",
        cta: { label: "Shop deals", href: "/products?sale=1" },
        products: deals,
        showDiscount: true,
        theme: { bg: "bg-[linear-gradient(110deg,oklch(0.33_0.15_275),oklch(0.45_0.2_285)_55%,oklch(0.55_0.2_305))]", eyebrow: "bg-accent text-accent-foreground", button: "bg-white text-[oklch(0.33_0.15_275)] hover:bg-white/90" },
      },
      {
        id: "phones",
        eyebrow: "New season tech",
        title: "The latest smartphones",
        text: fromPrice(phones) ? `Flagships and everyday phones from ${fromPrice(phones)}.` : "Flagships and everyday phones at great prices.",
        cta: { label: "Shop smartphones", href: "/category/smartphones" },
        products: top(phones, (p) => p.rating),
        theme: { bg: "bg-[linear-gradient(110deg,oklch(0.22_0.03_260),oklch(0.3_0.05_255))]", eyebrow: "bg-accent text-accent-foreground", button: "bg-accent text-accent-foreground hover:bg-accent/90" },
      },
      {
        id: "beauty",
        eyebrow: "Beauty edit",
        title: "Fragrances & beauty favourites",
        text: fromPrice(beauty) ? `Signature scents and everyday essentials from ${fromPrice(beauty)}.` : "Signature scents and everyday essentials.",
        cta: { label: "Explore beauty", href: "/category/fragrances" },
        products: top(beauty, (p) => p.rating),
        theme: { bg: "bg-[linear-gradient(110deg,oklch(0.45_0.14_10),oklch(0.58_0.16_25))]", eyebrow: "bg-white/20 text-white", button: "bg-white text-[oklch(0.42_0.14_10)] hover:bg-white/90" },
      },
    ];
  }, [products]);
}

function SlideProducts({ products, showDiscount, priority }: { products: Product[]; showDiscount?: boolean; priority: boolean }) {
  if (products.length === 0) return null;
  return (
    <ul className="hidden items-end gap-4 lg:flex" aria-hidden>
      {products.map((p, i) => (
        <li
          key={p.id}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5",
            i === 1 ? "size-48 xl:size-56" : "size-32 xl:size-40",
            i === 1 ? "" : "mb-3",
          )}
        >
          <ProductImage src={p.thumbnail} alt="" sizes="(min-width: 1024px) 224px, 160px" priority={priority && i === 1} className="p-3" />
          {showDiscount && p.discountPercentage >= 1 && (
            <span className="absolute top-2 left-2 rounded-md bg-destructive px-1.5 py-0.5 text-[11px] font-bold text-white">-{Math.round(p.discountPercentage)}%</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Promotional banner carousel (PRD §5.1 hero: seasonal / promotional content). */
export function Hero() {
  const slides = useSlides();
  const count = slides.length;
  // `pos` runs 0..count; position `count` is a copy of slide 1, so the track
  // always moves forward (3 → 1) and then snaps back to the real slide 1 unseen.
  const [pos, setPos] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const index = pos % count;

  const next = useCallback(() => {
    setAnimate(true);
    setPos((p) => Math.min(p + 1, count));
  }, [count]);

  const prev = () => {
    if (pos > 0) {
      setAnimate(true);
      setPos(pos - 1);
      return;
    }
    // From slide 1, jump (unanimated) to the copy at the end, then slide back to slide 3.
    setAnimate(false);
    setPos(count);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setAnimate(true);
        setPos(count - 1);
      }),
    );
  };

  const goTo = (i: number) => {
    setAnimate(true);
    setPos(i);
  };

  // Reached the copy of slide 1: once the slide animation finishes, snap to the real one.
  useEffect(() => {
    if (pos !== count) return;
    const t = window.setTimeout(() => {
      setAnimate(false);
      setPos(0);
    }, SLIDE_MS + 20);
    return () => window.clearTimeout(t);
  }, [pos, count]);

  // Re-enable the animation on the frame after an instant snap.
  useEffect(() => {
    if (animate) return;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setAnimate(true));
    });
    return () => cancelAnimationFrame(id);
  }, [animate]);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(next, AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [pos, paused, next]);

  const renderSlide = (s: Slide, i: number, clone = false) => (
    <div
      key={clone ? `${s.id}-copy` : s.id}
      role={clone ? undefined : "group"}
      aria-roledescription={clone ? undefined : "slide"}
      aria-label={clone ? undefined : `${i + 1} of ${count}`}
      aria-hidden={clone || i !== index}
      inert={clone || i !== index}
      className={cn("relative flex min-h-[240px] w-full shrink-0 items-center justify-between gap-6 px-6 pt-8 pb-14 text-white sm:min-h-[280px] sm:pb-12 sm:px-10 lg:min-h-[320px] lg:px-14", s.theme.bg)}
    >
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="relative max-w-xl">
        <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase", s.theme.eyebrow)}>{s.eyebrow}</span>
        {clone ? (
          <p className="mt-4 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl xl:text-5xl">{s.title}</p>
        ) : (
          <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl xl:text-5xl">{s.title}</h2>
        )}
        <p className="mt-3 max-w-md text-sm text-white/85 sm:text-base">{s.text}</p>
        <Link href={s.cta.href} tabIndex={clone ? -1 : undefined} className={cn("mt-6 inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold shadow-sm transition", s.theme.button)}>
          {s.cta.label} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <SlideProducts products={s.products} showDiscount={s.showDiscount} priority={!clone && i === 0} />
    </div>
  );

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers"
      className="group relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className={cn("flex ease-out motion-reduce:transition-none", animate && "transition-transform duration-700")}
        style={{ transform: `translateX(-${pos * 100}%)` }}
      >
        {slides.map((s, i) => renderSlide(s, i))}
        {count > 1 && renderSlide(slides[0], 0, true)}
      </div>

      <button type="button" onClick={prev} aria-label="Previous offer" className="absolute top-1/2 left-3 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-foreground shadow opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 sm:block">
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" onClick={next} aria-label="Next offer" className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-foreground shadow opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 sm:block">
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Show offer ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            className={cn("h-2 rounded-full bg-white/50 transition-all hover:bg-white/80", i === index ? "w-6 bg-white" : "w-2")}
          />
        ))}
      </div>
    </section>
  );
}
