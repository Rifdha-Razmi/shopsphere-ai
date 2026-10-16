"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useUiStore } from "@/store/ui.store";
import { useHydrated } from "@/store/hydration.store";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { ProductImage } from "@/components/common/product-image";
import { Button } from "@/components/ui/button";
import { MAX_COMPARE } from "@/lib/constants";

export function CompareBar() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const ids = useUiStore((s) => s.compareIds);
  const remove = useUiStore((s) => s.removeCompare);
  const clear = useUiStore((s) => s.clearCompare);
  const { byId } = useCatalog();
  if (!hydrated || ids.length === 0 || pathname.startsWith("/compare") || pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-3 lg:bottom-4" role="region" aria-label="Product comparison tray">
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border bg-card p-2.5 shadow-xl">
        <ul className="flex flex-1 gap-2 overflow-x-auto">
          {ids.map((id) => {
            const p = byId.get(id);
            return (
              <li key={id} className="relative flex shrink-0 items-center gap-2 rounded-lg border bg-background py-1 pr-7 pl-1">
                <span className="relative size-9 shrink-0 overflow-hidden rounded bg-white">
                  <ProductImage src={p?.thumbnail} alt={p?.title ?? "Product"} sizes="36px" />
                </span>
                <span className="hidden max-w-28 truncate text-xs sm:block">{p?.title ?? "Unavailable"}</span>
                <button type="button" onClick={() => remove(id)} className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-0.5 hover:bg-muted" aria-label={`Remove ${p?.title ?? "product"} from comparison`}>
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
          <Button size="sm" asChild disabled={ids.length < 2}>
            <Link href="/compare" aria-disabled={ids.length < 2}>
              Compare ({ids.length}/{MAX_COMPARE})
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
