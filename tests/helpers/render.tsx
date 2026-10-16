import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useHydrationStore } from "@/store/hydration.store";
import { queryKeys } from "@/lib/query-keys";
import type { Product } from "@/types";

export function renderWithProviders(ui: ReactElement, { catalog }: { catalog?: Product[] } = {}) {
  useHydrationStore.setState({ hydrated: true });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  if (catalog) client.setQueryData(queryKeys.catalog, catalog);
  if (catalog) client.setQueryData(queryKeys.categories, Array.from(new Set(catalog.map((p) => p.category))).map((slug) => ({ slug, name: slug })));
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...render(ui, { wrapper: Wrapper }) };
}
