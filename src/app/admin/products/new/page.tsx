import type { Metadata } from "next";
import { NewProductForm } from "@/features/admin/components/product-form";
export const metadata: Metadata = { title: "Add product" };
export default function NewProductPage() {
  return <NewProductForm />;
}
