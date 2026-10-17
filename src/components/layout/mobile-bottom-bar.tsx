"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutDashboard, LayoutGrid, ShoppingCart, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import { useUiStore } from "@/store/ui.store";
import { useHydrated } from "@/store/hydration.store";
import { cn } from "@/lib/cn";
import { useAuth } from "@/features/auth/hooks/useAuth";

/** Mobile: bottom-accessible cart and assistant (PRD §15). */
export function MobileBottomBar() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const setAssistantOpen = useUiStore((s) => s.setAssistantOpen);
  const { isAdmin } = useAuth();
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;

  const item = (href: string, label: string, Icon: typeof Home, badge?: number) => (
    <Link href={href} className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground", pathname === href && "text-primary")} aria-current={pathname === href ? "page" : undefined}>
      <Icon className="size-5" aria-hidden />
      {label}
      {!!badge && (
        <span className="absolute top-1 left-1/2 ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground" aria-label={`${badge} items`}>
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <nav aria-label="Quick access" className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {item("/", "Home", Home)}
      {item("/products", "Shop", LayoutGrid)}
      {!isAdmin && (
        <button type="button" onClick={() => setAssistantOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-primary">
          <Sparkles className="size-5" aria-hidden />
          Ask AI
        </button>
      )}
      {isAdmin ? (
        item("/admin", "Admin", LayoutDashboard)
      ) : (
        <>
          {item("/wishlist", "Wishlist", Heart)}
          {item("/cart", "Cart", ShoppingCart, hydrated ? count : 0)}
        </>
      )}
    </nav>
  );
}
