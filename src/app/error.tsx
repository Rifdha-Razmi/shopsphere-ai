"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/common/state-views";

/** Route-level error boundary. Never renders raw error messages or stacks (PRD §13). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log for developers only; the UI shows a safe message.
    console.error("[ShopSphere] Unhandled UI error", error.digest ?? "");
  }, [error]);
  return (
    <main className="container-page py-16">
      <ErrorState title="Something went wrong" description="An unexpected error occurred while showing this page. Please try again." onRetry={reset} />
    </main>
  );
}
