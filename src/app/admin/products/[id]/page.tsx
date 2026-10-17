import type { Metadata } from "next";
import { EditProductForm } from "@/features/admin/components/product-form";
export const metadata: Metadata = { title: "Edit product" };
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditProductForm id={Number(id)} />;
}
