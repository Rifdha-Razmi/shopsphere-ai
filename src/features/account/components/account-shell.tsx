"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { UserAvatar } from "@/components/common/user-avatar";
import { BRAND_PANEL } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { AccountNav, showsAccountNav } from "./account-nav";

/** Account layout: sidebar on Profile / My reviews / Preferences; orders and history pages use the full width. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!showsAccountNav(pathname)) return <div className="container-page py-8">{children}</div>;
  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className={cn("relative overflow-hidden rounded-2xl p-4 shadow-lg shadow-primary/10 lg:sticky lg:top-32 lg:self-start", BRAND_PANEL)}>
        <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
        {user && (
          <div className="relative mb-4 hidden items-center gap-3 border-b border-white/10 pb-4 lg:flex">
            <UserAvatar user={user} className="size-11 bg-white text-primary ring-2 ring-white/30" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.firstName} {user.lastName}</p>
              <p className="truncate text-xs text-white/60">{user.email}</p>
            </div>
          </div>
        )}
        <p className="relative mb-2 hidden px-3 text-xs font-semibold tracking-wide text-white/50 uppercase lg:block">My account</p>
        <div className="relative">
          <AccountNav />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
