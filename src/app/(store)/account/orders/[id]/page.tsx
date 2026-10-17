import type { Metadata } from "next";
import { OrderDetailView } from "@/features/orders/components/order-detail-view";

export const metadata: Metadata = { title: "Order tracking" };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailView orderId={decodeURIComponent(id)} />;
}
