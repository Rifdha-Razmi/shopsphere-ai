"use client";

import { GitCompareArrows } from "lucide-react";
import { toast } from "sonner";
import type { ProductId } from "@/types";
import { useUiStore } from "@/store/ui.store";
import { useHydrated } from "@/store/hydration.store";
import { cn } from "@/lib/cn";

export function CompareToggle({ productId, title, className }: { productId: ProductId; title: string; className?: string }) {
  const hydrated = useHydrated();
  const selected = useUiStore((s) => s.compareIds.includes(productId));
  const toggle = useUiStore((s) => s.toggleCompare);
  const on = hydrated && selected;
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground select-none hover:text-foreground", className)} onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        className="size-3.5 accent-[var(--primary)]"
        checked={on}
        onChange={() => {
          const r = toggle(productId);
          if (!r.ok) toast.error(r.message);
        }}
        aria-label={`Compare ${title}`}
      />
      <GitCompareArrows className="size-3.5" aria-hidden />
      <span className="hidden sm:inline">Compare</span>
    </label>
  );
}
