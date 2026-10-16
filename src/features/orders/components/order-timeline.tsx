import { Check, CircleDot } from "lucide-react";
import type { Order } from "@/types";
import { buildTimeline } from "@/services/orders/orders.service";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Order tracking timeline (MOD-08): horizontal on desktop, vertical on mobile. */
export function OrderTimeline({ order }: { order: Pick<Order, "status" | "timeline"> }) {
  const steps = buildTimeline(order);
  return (
    <ol className="grid grid-cols-1 gap-0 md:grid-cols-6" aria-label="Order progress">
      {steps.map((s, i) => (
        <li key={s.status} className="relative flex gap-3 pb-6 md:flex-col md:items-center md:pb-0 md:text-center" aria-current={s.state === "current" ? "step" : undefined}>
          {i < steps.length - 1 && (
            <span aria-hidden className={cn("absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 md:top-[15px] md:left-[calc(50%+18px)] md:h-0.5 md:w-[calc(100%-36px)]", s.state === "complete" ? "bg-success" : "bg-border")} />
          )}
          <span className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2", s.state === "complete" ? "border-success bg-success text-success-foreground" : s.state === "current" ? "border-primary bg-card text-primary ring-4 ring-primary/15" : "border-border bg-card text-muted-foreground")}>
            {s.state === "complete" ? <Check className="size-4" /> : s.state === "current" ? <CircleDot className="size-4" /> : <span className="text-xs">{i + 1}</span>}
          </span>
          <span className="md:mt-2">
            <span className={cn("block text-sm", s.state === "upcoming" ? "text-muted-foreground" : "font-semibold")}>{ORDER_STATUS_LABELS[s.status]}</span>
            <span className="block text-xs text-muted-foreground">{s.at ? formatDateTime(s.at) : s.state === "upcoming" ? "Upcoming" : ""}</span>
            <span className="sr-only">{s.state === "complete" ? "completed" : s.state === "current" ? "current status" : "upcoming"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
