"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useOrdersStore } from "@/store/orders.store";
import { useHydrated } from "@/store/hydration.store";
import { isSessionValid } from "@/services/auth/auth.service";
import { PROTECTED_PREFIXES } from "@/lib/constants";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * - Slides the session expiry forward on user activity.
 * - Detects inactivity expiry; on a protected page, sends the user to sign in
 *   and back to the same page afterwards (MOD-06-001).
 * - Swaps guest/account carts and wishlists on sign-in/out.
 * - Runs the simulated logistics clock for order tracking.
 */
export function SessionWatcher() {
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  const userId = useAuthStore((s) => s.session?.user.id ?? null);

  // Owner sync (cart + wishlist follow the signed-in account).
  useEffect(() => {
    if (!hydrated) return;
    useCartStore.getState().switchOwner(userId);
    useWishlistStore.getState().switchOwner(userId);
  }, [hydrated, userId]);

  useEffect(() => {
    if (!hydrated) return;
    const touch = () => useAuthStore.getState().touch();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const check = () => {
      const { session, expire } = useAuthStore.getState();
      if (session && !isSessionValid(session)) {
        expire();
        const path = pathRef.current;
        if (PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
          toast.warning("Your session expired due to inactivity. Sign in to continue where you left off.");
          router.push(`/login?reason=expired&next=${encodeURIComponent(path)}`);
        } else {
          toast.message("You've been signed out after a period of inactivity.");
        }
      }
      useOrdersStore.getState().tick();
    };
    check();
    const id = window.setInterval(check, 15_000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated, router]);

  return null;
}
