import { ProductDetailView } from "@/features/products/components/product-detail-view";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetailView key={id} id={Number(id)} />;
}
