import type { Metadata } from "next";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { AdminShell } from "@/features/admin/components/admin-shell";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · ShopSphere AI" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="admin">
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
