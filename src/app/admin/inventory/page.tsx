import type { Metadata } from "next";
import { InventoryAdmin } from "@/features/admin/components/inventory-admin";
export const metadata: Metadata = { title: "Inventory" };
export default function Page() {
  return <InventoryAdmin />;
}
