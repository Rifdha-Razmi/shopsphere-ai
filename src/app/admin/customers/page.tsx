import type { Metadata } from "next";
import { CustomersAdmin } from "@/features/admin/components/customers-admin";
export const metadata: Metadata = { title: "Customers" };
export default function Page() {
  return <CustomersAdmin />;
}
