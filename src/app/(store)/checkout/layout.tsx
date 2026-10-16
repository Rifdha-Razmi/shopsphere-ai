import { RequireAuth } from "@/features/auth/components/require-auth";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="customer">{children}</RequireAuth>;
}
