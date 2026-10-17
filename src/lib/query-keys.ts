/** Centralised TanStack Query keys — one place to reason about caching. */
export const queryKeys = {
  catalog: ["catalog"] as const,
  categories: ["categories"] as const,
  product: (id: number) => ["product", id] as const,
  search: (q: string) => ["search", q] as const,
  suggestions: (q: string) => ["search", "suggest", q] as const,
  users: ["users"] as const,
  recommendations: (key: unknown[]) => ["recommendations", ...key] as const,
};
