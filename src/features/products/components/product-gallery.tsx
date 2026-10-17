"use client";

import { useState } from "react";
import { Expand } from "lucide-react";
import { ProductImage } from "@/components/common/product-image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

/** Image gallery with thumbnail navigation, zoom-on-hover and a lightbox (MOD-04). */
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const list = images.length ? images : [""];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const current = list[Math.min(index, list.length - 1)];

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {list.length > 1 && (
        <ul className="scrollbar-none flex gap-2 overflow-x-auto md:max-h-[520px] md:flex-col md:overflow-y-auto" aria-label="Product images">
          {list.map((src, i) => (
            <li key={`${src}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${list.length}`}
                aria-current={i === index}
                className={cn("relative block size-16 overflow-hidden rounded-lg border-2 bg-white sm:size-18", i === index ? "border-primary" : "border-transparent ring-1 ring-border hover:border-primary/40")}
              >
                <ProductImage src={src} alt="" sizes="72px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative flex-1">
        <button
          type="button"
          className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl border bg-white"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setLightbox(true)}
          aria-label={`Open full-size image of ${title}`}
        >
          <span className="absolute inset-4 block transition-transform duration-150" style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}>
            <ProductImage src={current} alt={`${title} — image ${index + 1}`} sizes="(max-width: 768px) 100vw, 50vw" priority />
          </span>
          <span className="absolute right-3 bottom-3 rounded-full bg-card/90 p-2 shadow ring-1 ring-border" aria-hidden>
            <Expand className="size-4" />
          </span>
        </button>
      </div>
      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-4xl p-3 sm:p-4">
          <DialogTitle className="sr-only">{title} images</DialogTitle>
          <div className="relative aspect-square max-h-[78dvh] w-full bg-white">
            <ProductImage src={current} alt={`${title} — image ${index + 1}`} sizes="90vw" />
          </div>
          {list.length > 1 && (
            <div className="flex justify-center gap-2">
              {list.map((_, i) => (
                <button key={i} type="button" onClick={() => setIndex(i)} className={cn("size-2.5 rounded-full", i === index ? "bg-primary" : "bg-muted-foreground/30")} aria-label={`Image ${i + 1}`} aria-current={i === index} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
