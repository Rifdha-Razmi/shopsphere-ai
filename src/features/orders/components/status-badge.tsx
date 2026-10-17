import type { OrderStatus } from "@/types";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variant = status === "delivered" ? "success" : status === "placed" || status === "confirmed" ? "secondary" : "warning";
  return <Badge variant={variant}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
