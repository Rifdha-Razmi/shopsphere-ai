import type { Order, OrderStatus, OrderTimelineEntry } from "@/types";
import { ORDER_STATUSES } from "@/types";
import fixture from "@/mocks/orders.json";

/** Pure order lifecycle logic (PRD §5.8). */

/** Simulated logistics clock: minutes after placement at which each stage is reached. */
export const AUTO_PROGRESS_MINUTES: Record<OrderStatus, number> = {
  placed: 0,
  confirmed: 1,
  packed: 5,
  shipped: 15,
  "out-for-delivery": 60,
  delivered: 180,
};

export function statusIndex(status: OrderStatus): number {
  return ORDER_STATUSES.indexOf(status);
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = statusIndex(status);
  return i >= 0 && i < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[i + 1] : null;
}

/** Advances an order one stage, stamping the timeline. */
export function advanceOrder(order: Order, at = new Date()): Order {
  const next = nextStatus(order.status);
  if (!next) return order;
  return { ...order, status: next, timeline: [...order.timeline, { status: next, at: at.toISOString() }] };
}

/** Applies the simulated logistics clock: advances through every stage whose time has passed. */
export function autoProgress(order: Order, now = Date.now()): Order {
  if (order.source !== "local") return order;
  const placed = Date.parse(order.createdAt);
  let current = order;
  let next = nextStatus(current.status);
  while (next && now - placed >= AUTO_PROGRESS_MINUTES[next] * 60_000) {
    current = advanceOrder(current, new Date(placed + AUTO_PROGRESS_MINUTES[next] * 60_000));
    next = nextStatus(current.status);
  }
  return current;
}

export interface TimelineStep {
  status: OrderStatus;
  state: "complete" | "current" | "upcoming";
  at: string | null;
}

/** Full six-step timeline for rendering — completed stages carry their timestamp. */
export function buildTimeline(order: Pick<Order, "status" | "timeline">): TimelineStep[] {
  const current = statusIndex(order.status);
  const stamps = new Map(order.timeline.map((t) => [t.status, t.at]));
  return ORDER_STATUSES.map((status, i) => ({
    status,
    state: i < current ? "complete" : i === current ? (status === "delivered" ? "complete" : "current") : "upcoming",
    at: i <= current ? stamps.get(status) ?? null : null,
  }));
}

export function expectedDelivery(from: Date, etaDays: [number, number]): string {
  const d = new Date(from);
  let added = 0;
  const target = etaDays[1];
  while (added < target) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++; // skip Sundays
  }
  return d.toISOString();
}

interface FixtureOrder extends Omit<Order, "createdAt" | "timeline" | "expectedDelivery" | "source" | "status"> {
  status: string;
  createdOffsetHours: number;
  expectedDeliveryOffsetHours: number;
  timeline: { status: string; offsetHours: number }[];
}

/** Resolves fixture orders (relative offsets) to absolute timestamps at first load. */
export function loadFixtureOrders(now = Date.now()): Order[] {
  const hours = (h: number) => new Date(now + h * 3_600_000).toISOString();
  return (fixture.orders as unknown as FixtureOrder[]).map((o) => {
    const { createdOffsetHours, expectedDeliveryOffsetHours, timeline, ...rest } = o;
    return {
      ...rest,
      status: o.status as OrderStatus,
      createdAt: hours(createdOffsetHours),
      expectedDelivery: hours(expectedDeliveryOffsetHours),
      timeline: timeline.map((t): OrderTimelineEntry => ({ status: t.status as OrderStatus, at: hours(t.offsetHours) })),
      source: "fixture" as const,
    };
  });
}

export function hasPurchased(orders: Order[], userId: string, productId: number): boolean {
  return orders.some((o) => o.userId === userId && o.lines.some((l) => l.productId === productId));
}
