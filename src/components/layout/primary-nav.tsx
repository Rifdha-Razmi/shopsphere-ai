"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid, Sparkles } from "lucide-react";
import type { Category } from "@/types";
import { cn } from "@/lib/cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUiStore } from "@/store/ui.store";

export interface NavLink {
  href: string;
  label: string;
  /** Returns true when this link represents the current page. */
  isActive: (pathname: string) => boolean;
}

/** Primary store navigation (PRD §5.1 header). Shared with the mobile menu. */
export function primaryLinks(isAdmin: boolean): NavLink[] {
  return [
    { href: "/", label: "Home", isActive: (p) => p === "/" },
    { href: "/products", label: "All Products", isActive: (p) => p === "/products" },
    ...(isAdmin ? [] : [{ href: "/account/orders", label: "My Orders", isActive: (p: string) => p.startsWith("/account/orders") }]),
  ];
}

function CategoriesMenu({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const inCategory = pathname.startsWith("/category/");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-9 shrink-0 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring",
          inCategory && "ring-2 ring-primary/30",
        )}
      >
        <LayoutGrid className="size-4" aria-hidden /> Categories <ChevronDown className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-[min(92vw,720px)] p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-sm font-semibold">Shop by category</p>
          <DropdownMenuItem asChild className="w-auto p-0 text-xs font-medium text-primary focus:bg-transparent">
            <Link href="/products">View all products</Link>
          </DropdownMenuItem>
        </div>
        <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3">
          {categories.length === 0
            ? Array.from({ length: 12 }, (_, i) => <span key={i} className="skeleton-shimmer m-1 h-7 rounded-md" aria-hidden />)
            : categories.map((c) => (
                <DropdownMenuItem key={c.slug} asChild>
                  <Link href={`/category/${c.slug}`} className={cn("cursor-pointer", pathname === `/category/${c.slug}` && "bg-secondary font-medium")}>
                    {c.name}
                  </Link>
                </DropdownMenuItem>
              ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Second header row: a Categories mega-menu plus the main store links.
 * Phones use the hamburger menu and bottom bar instead.
 */
export function PrimaryNav({ categories, isAdmin }: { categories: Category[]; isAdmin: boolean }) {
  const pathname = usePathname();
  const setAssistantOpen = useUiStore((s) => s.setAssistantOpen);

  return (
    <nav aria-label="Main" className="hidden border-t md:block">
      <div className="container-page flex h-12 items-center gap-2">
        <CategoriesMenu categories={categories} />
        <ul className="scrollbar-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {primaryLinks(isAdmin).map((l) => {
            const active = l.isActive(pathname);
            return (
              <li key={l.href} className="shrink-0">
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative block rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-foreground/80 hover:bg-muted hover:text-foreground",
                    active && "text-primary after:absolute after:inset-x-3 after:-bottom-[7px] after:h-0.5 after:rounded-full after:bg-primary",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        {!isAdmin && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-primary hover:bg-secondary"
        >
          <Sparkles className="size-4" aria-hidden /> Ask AI
        </button>
        )}
      </div>
    </nav>
  );
}
