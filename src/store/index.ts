import { useAccountStore } from "./account.store";
import { useAdminStore } from "./admin.store";
import { useAnalyticsStore } from "./analytics.store";
import { useAssistantStore } from "./assistant.store";
import { useAuthStore } from "./auth.store";
import { useCartStore } from "./cart.store";
import { useCheckoutStore } from "./checkout.store";
import { useOrdersStore } from "./orders.store";
import { useReviewsStore } from "./reviews.store";
import { useSignalsStore } from "./signals.store";
import { useUiStore } from "./ui.store";
import { useWishlistStore } from "./wishlist.store";

export {
  useAccountStore,
  useAdminStore,
  useAnalyticsStore,
  useAssistantStore,
  useAuthStore,
  useCartStore,
  useCheckoutStore,
  useOrdersStore,
  useReviewsStore,
  useSignalsStore,
  useUiStore,
  useWishlistStore,
};

/** Every persisted store, keyed by its storage key (used for hydration and cross-tab sync). */
export const PERSISTED_STORES = {
  "ss-auth": useAuthStore,
  "ss-cart": useCartStore,
  "ss-wishlist": useWishlistStore,
  "ss-signals": useSignalsStore,
  "ss-orders": useOrdersStore,
  "ss-reviews": useReviewsStore,
  "ss-checkout": useCheckoutStore,
  "ss-account": useAccountStore,
  "ss-admin": useAdminStore,
  "ss-analytics": useAnalyticsStore,
  "ss-ui": useUiStore,
  "ss-assistant": useAssistantStore,
} as const;
