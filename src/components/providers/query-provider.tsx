"use client";

import { useState, type ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ApiError } from "@/services/api/http";

const PERSISTED_KEYS = new Set(["catalog", "categories"]);

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 24 * 60 * 60_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => !(error instanceof ApiError && (error.kind === "not-found" || error.kind === "parse")) && count < 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 6000),
      },
    },
  });
}

/**
 * Server/cache state. The catalogue and categories are persisted to
 * localStorage so a returning visitor — or one who goes offline — sees the
 * last-known data instead of a blank screen (PRD §16 network-failure state).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  const [persister] = useState(() =>
    createSyncStoragePersister({ storage: typeof window === "undefined" ? undefined : window.localStorage, key: "ss-query-cache", throttleTime: 2000 }),
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60_000,
        buster: "v1",
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && PERSISTED_KEYS.has(String(q.queryKey[0])) },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
