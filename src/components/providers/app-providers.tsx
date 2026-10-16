"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { QueryProvider } from "./query-provider";
import { StoreHydrator } from "./store-hydrator";
import { SessionWatcher } from "./session-watcher";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <StoreHydrator />
      <SessionWatcher />
      {children}
      <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 3500 }} />
    </QueryProvider>
  );
}
