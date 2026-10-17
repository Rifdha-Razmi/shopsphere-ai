import type { Metadata } from "next";
import { CategoriesAdmin } from "@/features/admin/components/categories-admin";
export const metadata: Metadata = { title: "Categories" };
export default function Page() {
  return <CategoriesAdmin />;
}
