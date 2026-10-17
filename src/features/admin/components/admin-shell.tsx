"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, Boxes, ChevronDown, FolderTree, LayoutDashboard, LogOut, Menu, MessageSquare, Package, ShoppingBag, Store, User as UserIcon, Users } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import { safeGet, safeSet } from "@/utils/storage";
import { cn } from "@/lib/cn";
import { BRAND_PANEL } from "@/lib/brand";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/analytics", label: "Recommendation analytics", icon: BarChart3 },
];

const COLLAPSE_KEY = "ss-admin-sidebar-collapsed";

function useSignOut() {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  return () => {
    logout();
    toast.success("You've been signed out.");
    router.push("/login");
  };
}

function Nav({ collapsed = false, onNavigate, dark = false }: { collapsed?: boolean; onNavigate?: () => void; dark?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="grid gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              dark
                ? active
                  ? "bg-white text-primary shadow-md"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
                : active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ collapsed = false, dark = false }: { collapsed?: boolean; dark?: boolean }) {
  const signOut = useSignOut();
  return (
    <button
      type="button"
      onClick={signOut}
      title={collapsed ? "Logout" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
        dark ? "text-[oklch(0.8_0.13_22)] hover:bg-[oklch(0.62_0.2_25)]/20 hover:text-[oklch(0.88_0.1_22)]" : "text-destructive hover:bg-destructive/10",
        collapsed ? "justify-center px-0" : "px-3",
      )}
    >
      <LogOut className="size-[18px] shrink-0" aria-hidden />
      {collapsed ? <span className="sr-only">Logout</span> : "Logout"}
    </button>
  );
}

function ProfileMenu() {
  const { user } = useAuth();
  const router = useRouter();
  const signOut = useSignOut();
  if (!user) return null;
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="ml-auto flex items-center gap-3 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-muted" aria-label={`Account menu for ${fullName}`}>
          <UserAvatar user={user} className="size-10 text-base" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block max-w-48 truncate text-sm font-semibold">{fullName}</span>
            <span className="block max-w-48 truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <DropdownMenuLabel className="flex items-center gap-3 border-b px-4 py-3 font-normal">
          <UserAvatar user={user} className="size-11 text-base" />
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Logged in as</span>
            <span className="block truncate text-sm font-semibold">{fullName}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <div className="p-1">
          <DropdownMenuItem onSelect={() => router.push("/admin/profile")} className="px-3">
            <UserIcon /> My profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/")} className="px-3">
            <Store /> View store
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />
        <div className="p-1">
          <DropdownMenuItem onSelect={signOut} className="px-3 font-medium text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive [&_svg]:!text-destructive">
            <LogOut /> Logout
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore the desktop sidebar preference after mount (avoids a hydration mismatch).
  useEffect(() => {
    setCollapsed(safeGet<boolean>(COLLAPSE_KEY, false)); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const toggleMenu = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed((c) => {
        safeSet(COLLAPSE_KEY, !c);
        return !c;
      });
    } else setMobileOpen(true);
  };


  return (
    <div className={cn("min-h-dvh transition-[grid-template-columns] duration-200 lg:grid", collapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[256px_minmax(0,1fr)]")}>
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>

      <aside className={cn("hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col", BRAND_PANEL)} aria-label="Admin sidebar">
        <div className={cn("flex h-16 items-center border-b border-white/10", collapsed ? "justify-center px-2" : "px-5")}>
          <Logo compact={collapsed} className="text-white" />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {!collapsed && <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-white/50 uppercase">Admin</p>}
          <Nav collapsed={collapsed} dark />
        </div>
        <div className="border-t border-white/10 p-3">
          <LogoutButton collapsed={collapsed} dark />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" onClick={toggleMenu} aria-label={collapsed ? "Expand menu" : "Toggle menu"} aria-expanded={!collapsed}>
            <Menu className="size-5" />
          </Button>
          <div className="flex-1" />
          <ProfileMenu />
        </header>
        <main id="admin-main" className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle><Logo /></SheetTitle>
            <SheetDescription className="sr-only">Admin navigation</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3">
            <Nav onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="border-t p-3">
            <LogoutButton />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * Persistence-scope labels required by the PRD: admin edits are saved to this
 * browser only (§4.2 Data Write Policy), and analytics come from local data (§8.4).
 */
const SCOPE_LABELS = { local: "Saved locally", analytics: "Local Analytics" } as const;

export function AdminPageHeader({ title, description, actions, scope }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; scope?: keyof typeof SCOPE_LABELS }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
          {title}
          {scope && <Badge variant="local" className="text-xs font-medium">{SCOPE_LABELS[scope]}</Badge>}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
