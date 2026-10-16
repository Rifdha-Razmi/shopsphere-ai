"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { useWishlistStore } from "@/store/wishlist.store";
import { useHydrated } from "@/store/hydration.store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCanShop } from "@/features/auth/hooks/useCanShop";
import { cn } from "@/lib/cn";

export function WishlistButton({ product, className, variant = "icon" }: { product: Product; className?: string; variant?: "icon" | "full" }) {
  const hydrated = useHydrated();
  const active = useWishlistStore((s) => s.items.some((i) => i.productId === product.id));
  const toggle = useWishlistStore((s) => s.toggle);
  const { isAdmin } = useAuth();
  const canShop = useCanShop();
  const on = hydrated && !isAdmin && active;

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canShop()) return;
    const added = toggle(product);
    if (added) toast.success("Saved to wishlist", { description: product.title });
    else toast.message("Removed from wishlist");
  };

  if (variant === "full") {
    return (
      <button type="button" onClick={onClick} aria-pressed={on} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-muted", className)}>
        <Heart className={cn("size-5", on && "fill-destructive text-destructive")} />
        {on ? "Wishlisted" : "Wishlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
      className={cn("flex size-9 items-center justify-center rounded-full bg-card/95 shadow-sm ring-1 ring-border transition hover:scale-105", className)}
    >
      <Heart className={cn("size-4.5", on ? "fill-destructive text-destructive" : "text-muted-foreground")} />
    </button>
  );
}
