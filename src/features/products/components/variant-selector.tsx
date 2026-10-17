"use client";

import type { ProductVariant, VariantAttribute } from "@/types";
import { cn } from "@/lib/cn";

const SWATCH: Record<string, string> = {
  Black: "#1f2937", Blue: "#2563eb", Silver: "#cbd5e1", Red: "#dc2626", Green: "#16a34a", White: "#f8fafc", Gold: "#d4a017", Brown: "#7c4a21",
};

/** Variant picker — out-of-stock variants stay visible but disabled (MOD-04-001). */
export function VariantSelector({ variants, selectedId, onSelect }: { variants: ProductVariant[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const attr: VariantAttribute = variants[0]?.attributes.size ? "size" : "color";
  const selected = variants.find((v) => v.id === selectedId);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {attr === "size" ? "Size" : "Colour"}: <span className="font-normal text-muted-foreground">{selected?.attributes[attr] ?? "Select one"}</span>
      </legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={attr === "size" ? "Size" : "Colour"}>
        {variants.map((v) => {
          const label = v.attributes[attr] ?? v.id;
          const out = v.stock <= 0;
          const active = v.id === selectedId;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={out}
              aria-label={`${label}${out ? " — out of stock" : v.stock <= 5 ? ` — only ${v.stock} left` : ""}`}
              onClick={() => !out && onSelect(v.id)}
              className={cn(
                "relative inline-flex h-10 min-w-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
                active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:border-foreground/40",
                out && "cursor-not-allowed text-muted-foreground line-through decoration-2 opacity-60 hover:border-border",
              )}
            >
              {attr === "color" && <span className="size-4 rounded-full ring-1 ring-black/15" style={{ background: SWATCH[label] ?? label }} aria-hidden />}
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
