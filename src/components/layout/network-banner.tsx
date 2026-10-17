"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Distinguishable offline state (PRD §16). Cached data keeps rendering underneath. */
export function NetworkBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="bg-foreground px-4 py-2 text-center text-sm text-background">
      <WifiOff className="mr-2 inline size-4 align-[-3px]" aria-hidden />
      You’re offline. Showing saved products where possible — actions will work once you reconnect.
    </div>
  );
}
