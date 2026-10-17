import type { Metadata } from "next";
import { OrderConfirmation } from "@/features/checkout/components/order-confirmation";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="container-page py-8">
      <OrderConfirmation orderId={decodeURIComponent(id)} />
    </div>
  );
}
