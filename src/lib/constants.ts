import type { Coupon, DeliveryMethod, OrderStatus, PaymentMethodId } from "@/types";

export const APP_NAME = "ShopSphere AI";

export const FREE_SHIPPING_THRESHOLD = 999;
export const STANDARD_SHIPPING_FEE = 79;
/** Simulated GST rate applied to the post-discount subtotal. */
export const TAX_RATE = 0.18;
export const LOW_STOCK_THRESHOLD = 10;
export const PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 350;
export const MAX_SEARCH_LENGTH = 120;
export const MAX_COMPARE = 4;
export const MAX_RECENTLY_VIEWED = 30;
export const MAX_SEARCH_HISTORY = 8;

export const REVIEW_MIN_CHARS = 3;
export const REVIEW_MAX_CHARS = 1000;

export const POPULAR_SEARCHES = ["iPhone", "running shoes", "laptop", "perfume", "watch", "sunglasses"];

/** Mock coupon codes (PRD §5.5). */
export const COUPONS: Coupon[] = [
  { code: "WELCOME10", description: "10% off your order (max ₹1,500)", kind: "percent", value: 10, minSubtotal: 500, maxDiscount: 1500, expiresAt: "2099-12-31" },
  { code: "FLAT500", description: "₹500 off orders above ₹4,999", kind: "flat", value: 500, minSubtotal: 4999, expiresAt: "2099-12-31" },
  { code: "FREESHIP", description: "Free delivery on any order", kind: "free-shipping", value: 0, minSubtotal: 0, expiresAt: "2099-12-31" },
  { code: "BIGSALE25", description: "25% off orders above ₹20,000 (max ₹6,000)", kind: "percent", value: 25, minSubtotal: 20000, maxDiscount: 6000, expiresAt: "2099-12-31" },
  { code: "DIWALI2024", description: "Festive 20% off", kind: "percent", value: 20, minSubtotal: 0, expiresAt: "2024-11-15" },
];

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { id: "standard", label: "Standard Delivery", description: "Delivered in 4–6 business days", cost: 0, etaDays: [4, 6] },
  { id: "express", label: "Express Delivery", description: "Delivered in 1–2 business days", cost: 149, etaDays: [1, 2] },
  { id: "same-day", label: "Same-Day Delivery", description: "Order before 2 PM, metro pincodes only", cost: 249, etaDays: [0, 0] },
];

export const PAYMENT_METHODS: { id: PaymentMethodId; label: string; description: string }[] = [
  { id: "mock-card", label: "Mock Card (test mode)", description: "Pick a test scenario — no card details are collected" },
  { id: "mock-upi", label: "Mock UPI (test mode)", description: "Pick a test UPI handle — no real UPI app is contacted" },
  { id: "mock-cod", label: "Mock Cash on Delivery", description: "Pay when your order arrives (simulated)" },
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
};

/** Demo accounts seeded locally (PRD §21). Use only in development. */
export const DEMO_ACCOUNTS = {
  customer: { email: "customer@shopsphere.dev", password: "Customer@123" },
  admin: { email: "admin@shopsphere.dev", password: "Admin@123" },
} as const;

export const PROTECTED_PREFIXES = ["/cart", "/wishlist", "/checkout", "/account", "/admin"];
export const SESSION_COOKIE = "ss_session";
