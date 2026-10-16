"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, SlidersHorizontal, User } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * "My account" sidebar. Orders and Wishlist are reached from the header,
 * addresses live on the Profile page, and the full Recently Viewed history
 * opens from the home page rail — so they aren't repeated here.
 */
export const ACCOUNT_LINKS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/reviews", label: "My reviews", icon: MessageSquare },
  { href: "/account/preferences", label: "Recommendation preferences", icon: SlidersHorizontal },
];

/** Pages that show the account sidebar; other /account pages (orders, recently viewed) are full width. */
export const showsAccountNav = (pathname: string) => ACCOUNT_LINKS.some((l) => l.href === pathname);

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col">
      {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/account" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors", active ? "bg-white text-primary shadow-md" : "text-white/75 hover:bg-white/10 hover:text-white")}>
            <Icon className="size-4 shrink-0" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
