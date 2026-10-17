import type { ProductId } from "./product";

export interface CartItem {
  /** `${productId}:${variantId ?? "default"}` — one line per product/variant. */
  key: string;
  productId: ProductId;
  variantId: string | null;
  variantLabel: string | null;
  quantity: number;
  /** Price (INR) the customer saw when adding — used for price-change detection. */
  unitPrice: number;
  /** Last-known product snapshot, used as a cache when the API is unavailable. */
  snapshot: {
    title: string;
    thumbnail: string;
    brand: string;
    category: string;
    stock: number;
    mrp: number;
  };
  addedAt: number;
}

export type CartIssue =
  | { type: "out-of-stock" }
  | { type: "insufficient-stock"; available: number }
  | { type: "unavailable" }
  | { type: "price-changed"; oldPrice: number; newPrice: number };

export interface Coupon {
  code: string;
  description: string;
  kind: "percent" | "flat" | "free-shipping";
  value: number;
  minSubtotal: number;
  maxDiscount?: number;
  expiresAt: string;
}

export type CouponResult =
  | { ok: true; coupon: Coupon }
  | { ok: false; reason: "not-found" | "expired" | "min-subtotal"; message: string };

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  mrpTotal: number;
  productSavings: number;
  couponDiscount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type DeliveryMethodId = "standard" | "express" | "same-day";

export interface DeliveryMethod {
  id: DeliveryMethodId;
  label: string;
  description: string;
  cost: number;
  etaDays: [number, number];
}

export type PaymentMethodId = "mock-card" | "mock-upi" | "mock-cod";

export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out-for-delivery",
  "delivered",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderLine {
  productId: ProductId;
  variantId: string | null;
  variantLabel: string | null;
  title: string;
  thumbnail: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  at: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  createdAt: string;
  lines: OrderLine[];
  address: Omit<Address, "id" | "isDefault" | "label">;
  delivery: { id: DeliveryMethodId; label: string; cost: number };
  payment: { method: PaymentMethodId; label: string; reference: string };
  totals: CartTotals;
  couponCode: string | null;
  status: OrderStatus;
  timeline: OrderTimelineEntry[];
  expectedDelivery: string;
  /** "fixture" orders ship with the repo; "local" orders were placed in this browser. */
  source: "fixture" | "local";
}

export interface Review {
  id: string;
  productId: ProductId;
  userId: string | null;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  helpful: number;
  notHelpful: number;
  /** Only meaningful for fixture/source reviews; local reviews derive it from order history. */
  verifiedPurchase: boolean;
  source: "dummyjson" | "fixture" | "local";
}

export type ReviewSort = "recent" | "highest" | "lowest" | "helpful";
