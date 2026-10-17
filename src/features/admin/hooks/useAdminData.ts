"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/services/api/users.api";
import { queryKeys } from "@/lib/query-keys";
import { useCatalog } from "@/features/products/hooks/useCatalog";
import { useOrdersStore } from "@/store/orders.store";
import { useAuthStore } from "@/store/auth.store";
import { seedUsers } from "@/services/auth/auth.service";

/** Admin view of the data: full catalogue (incl. archived), every local order, all customers. */
export function useAdminData() {
  const catalog = useCatalog();
  const orders = useOrdersStore((s) => s.orders);
  const localUsers = useAuthStore((s) => s.users);
  const users = useQuery({ queryKey: queryKeys.users, queryFn: ({ signal }) => fetchUsers({ limit: 0 }, signal), staleTime: 10 * 60_000 });

  const customers = useMemo(() => {
    const local = [...seedUsers(), ...localUsers.filter((u) => u.passwordHash)].map((u) => ({ ...u, city: "", country: "India" }));
    return [...local, ...(users.data?.users ?? [])];
  }, [users.data, localUsers]);

  const referencedIds = useMemo(() => new Set(orders.flatMap((o) => o.lines.map((l) => l.productId))), [orders]);

  return { catalog, orders, customers, usersQuery: users, referencedIds };
}
