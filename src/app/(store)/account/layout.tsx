import { RequireAuth } from "@/features/auth/components/require-auth";
import { AccountShell } from "@/features/account/components/account-shell";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth role="customer">
      <AccountShell>{children}</AccountShell>
    </RequireAuth>
  );
}
