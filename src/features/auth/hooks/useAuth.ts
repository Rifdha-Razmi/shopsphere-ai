"use client";

import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/store/hydration.store";
import { isSessionValid } from "@/services/auth/auth.service";

export function useAuth() {
  const hydrated = useHydrated();
  const session = useAuthStore((s) => s.session);
  const valid = hydrated && isSessionValid(session);
  return {
    ready: hydrated,
    user: valid ? session!.user : null,
    isAuthenticated: valid,
    isAdmin: valid && session!.user.role === "admin",
  };
}
