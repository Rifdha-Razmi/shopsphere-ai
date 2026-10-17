"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LayoutDashboard, LogOut, Menu, Search, ShoppingCart, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchBar } from "@/features/search/components/search-bar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useUiStore } from "@/store/ui.store";
import { useHydrated } from "@/store/hydration.store";
import { useCategories } from "@/features/products/hooks/useCategories";
import { PrimaryNav, primaryLinks } from "./primary-nav";
import { toast } from "sonner";

function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground" aria-hidden>
          {count > 99 ? "99+" : count}
        </span>
      )}
      <span className="sr-only">
        {label}, {count} {count === 1 ? "item" : "items"}
      </span>
    </>
  );
}

export function Header() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const wishCount = useWishlistStore((s) => s.items.length);
  const setAssistantOpen = useUiStore((s) => s.setAssistantOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { categories } = useCategories();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="container-page flex h-16 items-center gap-3 lg:gap-6">
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
        <Logo className="shrink-0" />

        <div className="hidden flex-1 md:block">
          <Suspense fallback={<div className="h-11 rounded-lg border bg-card" />}>
            <SearchBar />
          </Suspense>
        </div>

        <nav aria-label="Account and cart" className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search className="size-5" />
          </Button>

          {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 sm:px-3" aria-label={`Account menu for ${user.firstName}`}>
                <User className="size-5" />
                <span className="hidden max-w-28 truncate text-left text-sm leading-tight lg:block">
                  <span className="block text-[11px] text-muted-foreground">Hello,</span>
                  {user.firstName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <>
                  <DropdownMenuLabel className="font-normal">
                    <div className="font-semibold">{user.firstName} {user.lastName}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin ? (
                    <DropdownMenuItem onSelect={() => router.push("/admin")}><LayoutDashboard /> Admin dashboard</DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onSelect={() => router.push("/account")}><User /> My account</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push("/wishlist")}><Heart /> Wishlist</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push("/cart")}><ShoppingCart /> Cart</DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      logout();
                      toast.success("You've been logged out.");
                      router.push("/");
                    }}
                    className="font-medium text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive [&_svg]:!text-destructive"
                  >
                    <LogOut /> Logout
                  </DropdownMenuItem>
              </>
            </DropdownMenuContent>
          </DropdownMenu>
          ) : (
            <Button variant="ghost" className="gap-2 px-2 sm:px-3" asChild>
              <Link href="/login" aria-label="Sign in">
                <User className="size-5" />
                <span className="hidden text-sm lg:block">Sign in</span>
              </Link>
            </Button>
          )}

          {!isAdmin && (
          <>
          <Button variant="ghost" size="icon" className="relative hidden sm:inline-flex" asChild>
            <Link href="/wishlist" aria-label="Wishlist">
              <Heart className="size-5" />
              <CountBadge count={hydrated ? wishCount : 0} label="Wishlist" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/cart" aria-label="Cart">
              <ShoppingCart className="size-5" />
              <CountBadge count={hydrated ? cartCount : 0} label="Cart" />
            </Link>
          </Button>
          </>
          )}
        </nav>
      </div>

      <Suspense fallback={<div className="hidden h-12 border-t md:block" />}>
        <PrimaryNav categories={categories} isAdmin={isAdmin} />
      </Suspense>

      {/* Cart count announcements for screen readers (PRD §14 live regions). */}
      <div aria-live="polite" className="sr-only">
        {hydrated ? `Cart has ${cartCount} ${cartCount === 1 ? "item" : "items"}` : ""}
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">Browse categories and account links</SheetDescription>
          </SheetHeader>
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-2">
            <div className="grid gap-0.5 pb-2">
              {[
                ...primaryLinks(isAdmin),
                ...(isAdmin
                  ? [{ href: "/admin", label: "Admin dashboard" }]
                  : [
                      { href: "/wishlist", label: "Wishlist" },
                      { href: user ? "/account" : "/login", label: user ? "My account" : "Sign in / Register" },
                    ]),
              ].map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted">
                  {l.label}
                </Link>
              ))}
              {!isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setAssistantOpen(true);
                }}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-muted"
              >
                <Sparkles className="size-4" /> Ask AI
              </button>
              )}
            </div>
            <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Categories</p>
            <div className="grid gap-0.5">
              {categories.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                  {c.name}
                </Link>
              ))}
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="bottom" className="h-[85dvh]">
          <SheetHeader>
            <SheetTitle>Search</SheetTitle>
            <SheetDescription className="sr-only">Search the catalogue</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <Suspense>
              <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
            </Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
