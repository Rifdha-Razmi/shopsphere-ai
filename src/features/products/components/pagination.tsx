"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

function pages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** URL-driven pagination (chosen over infinite scroll). */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const btn = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border bg-card px-2 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-4">
      <button type="button" className={btn} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </button>
      {pages(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground" aria-hidden>…</span>
        ) : (
          <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} aria-label={`Page ${p}`} className={cn(btn, p === page && "border-primary bg-primary text-primary-foreground hover:bg-primary")}>
            {p}
          </button>
        ),
      )}
      <button type="button" className={btn} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
