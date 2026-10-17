import { cn } from "@/lib/cn";

/**
 * Single-series horizontal bar list. One hue (primary) — no legend needed;
 * values are always printed as text, so identity/magnitude never rely on colour.
 * Each row carries a native tooltip (title) plus an accessible label.
 */
export function BarList({ items, format = (v) => v.toLocaleString("en-IN"), className, caption }: { items: { label: string; value: number; hint?: string }[]; format?: (v: number) => string; className?: string; caption: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure className={cn("space-y-2", className)}>
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.label} className="group grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm" title={`${i.label}: ${format(i.value)}${i.hint ? ` · ${i.hint}` : ""}`}>
            <span className="truncate text-muted-foreground">{i.label}</span>
            <span className="h-2.5 rounded-full bg-muted" aria-hidden>
              <span className="block h-full rounded-full bg-primary transition-opacity group-hover:opacity-80" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
            </span>
            <span className="text-right font-medium tabular-nums">{format(i.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function StatCard({ label, value, hint, badge }: { label: string; value: string; hint?: string; badge?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {badge}
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
