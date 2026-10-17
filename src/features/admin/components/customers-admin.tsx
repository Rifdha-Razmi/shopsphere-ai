"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAdminData } from "../hooks/useAdminData";
import { paginate } from "@/services/catalog/filter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/state-views";
import { Pagination } from "@/features/products/components/pagination";
import { AdminPageHeader } from "./admin-shell";

export function CustomersAdmin() {
  const { customers, usersQuery, orders } = useAdminData();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const orderCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.userId, (m.get(o.userId) ?? 0) + 1);
    return m;
  }, [orders]);
  const rows = useMemo(() => customers.filter((c) => `${c.firstName} ${c.lastName} ${c.email} ${c.username}`.toLowerCase().includes(q.toLowerCase())), [customers, q]);
  const { items, page: current, totalPages } = paginate(rows, page, 20);

  return (
    <>
      <AdminPageHeader title="Customers" description={`${customers.length} registered customers`} />
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input aria-label="Search customers" placeholder="Search by name, email or username" className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      {usersQuery.isPending ? <Skeleton className="h-96 w-full rounded-xl" /> : usersQuery.isError && customers.length <= 2 ? <ErrorState title="Couldn't load customers" onRetry={() => void usersQuery.refetch()} /> : (
        <>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Location</TableHead><TableHead>Role</TableHead><TableHead>Source</TableHead><TableHead className="text-right">Orders</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.firstName} {c.lastName}<span className="block text-xs font-normal text-muted-foreground">@{c.username}</span></TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell className="text-muted-foreground">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell>{c.role === "admin" ? <Badge>Admin</Badge> : <Badge variant="secondary">Customer</Badge>}</TableCell>
                    <TableCell><Badge variant={c.source === "dummyjson" ? "outline" : "local"}>{c.source === "dummyjson" ? "DummyJSON" : c.source === "seed" ? "Demo seed" : "Local"}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{orderCounts.get(c.id) ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
