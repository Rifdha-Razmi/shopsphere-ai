"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import type { UserRole } from "@/types";
import { useAuth } from "../hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import { EmptyState } from "@/components/common/state-views";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Client-side route guard (defence in depth behind proxy.ts). Handles the
 * case where a protected page is reached with an invalid/expired session
 * gracefully — redirect to sign in, then straight back here.
 * With `allowGuests` (cart, wishlist — PRD §4.3) signed-out visitors may stay;
 * only admins are sent away.
 */
export function RequireAuth({ children, role, allowGuests = false }: { children: ReactNode; role?: UserRole; allowGuests?: boolean }) {
  const { ready, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const expired = useAuthStore((s) => s.expiredReason === "inactivity");

  const adminOnCustomerPage = ready && isAuthenticated && role === "customer" && user?.role === "admin";

  useEffect(() => {
    if (adminOnCustomerPage) {
      router.replace("/admin");
      return;
    }
    if (ready && !isAuthenticated && !allowGuests) {
      const qs = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/login?${expired ? "reason=expired&" : ""}next=${encodeURIComponent(pathname + qs)}`);
    }
  }, [ready, isAuthenticated, pathname, router, expired, adminOnCustomerPage, allowGuests]);

  if (!ready || (!isAuthenticated && !allowGuests) || adminOnCustomerPage) {
    return (
      <div className="container-page space-y-4 py-10" role="status" aria-label="Checking your session">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (role && isAuthenticated && user?.role !== role) {
    return (
      <div className="container-page py-10">
        <EmptyState icon={<ShieldAlert className="size-7" />} title="You don't have access to this page" description="This area is only available to administrators." action={{ label: "Back to the store", href: "/" }} />
      </div>
    );
  }
  return <>{children}</>;
}
