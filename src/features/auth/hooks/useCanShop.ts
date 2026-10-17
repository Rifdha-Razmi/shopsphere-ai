"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

/**
 * Cart and wishlist actions (PRD §4.3): guests and customers may use them —
 * a guest cart is kept on this device and a guest wishlist lasts for the
 * session, both merged into the account on sign-in. Admins manage the store
 * and can't shop. Returns true when the user may proceed.
 */
export function useCanShop() {
  const { isAdmin } = useAuth();
  return useCallback(() => {
    if (isAdmin) {
      toast.message("Admin accounts manage the store and can't shop. Sign in with a customer account to buy.");
      return false;
    }
    return true;
  }, [isAdmin]);
}
