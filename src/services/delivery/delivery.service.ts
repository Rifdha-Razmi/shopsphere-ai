import { DELIVERY_METHODS } from "@/lib/constants";
import type { DeliveryMethodId } from "@/types";

/**
 * Simulated pincode-based delivery estimate (PRD §5.4). Indian pincodes
 * whose first three digits belong to major metros get faster estimates.
 * Not connected to any real logistics provider.
 */
const METRO_PREFIXES = ["110", "400", "560", "600", "700", "500", "411", "380"];

export interface DeliveryEstimate {
  serviceable: boolean;
  isMetro: boolean;
  minDays: number;
  maxDays: number;
  sameDayAvailable: boolean;
  codAvailable: boolean;
  message: string;
}

export function estimateDelivery(pincode: string, now = new Date()): DeliveryEstimate {
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return { serviceable: false, isMetro: false, minDays: 0, maxDays: 0, sameDayAvailable: false, codAvailable: false, message: "Enter a valid 6-digit pincode." };
  }
  if (pincode.startsWith("99")) {
    return { serviceable: false, isMetro: false, minDays: 0, maxDays: 0, sameDayAvailable: false, codAvailable: false, message: "Sorry, we don't deliver to this pincode yet." };
  }
  const isMetro = METRO_PREFIXES.includes(pincode.slice(0, 3));
  const [minDays, maxDays] = isMetro ? [1, 3] : [3, 6];
  const by = new Date(now);
  by.setDate(by.getDate() + maxDays);
  return {
    serviceable: true,
    isMetro,
    minDays,
    maxDays,
    sameDayAvailable: isMetro && now.getHours() < 14,
    codAvailable: true,
    message: `Delivery by ${by.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`,
  };
}

export function availableDeliveryMethods(pincode: string | null) {
  const metro = pincode ? estimateDelivery(pincode).isMetro : false;
  return DELIVERY_METHODS.map((m) => ({ ...m, disabled: m.id === "same-day" && !metro, disabledReason: m.id === "same-day" && !metro ? "Only for metro pincodes" : undefined }));
}

export function deliveryMethod(id: DeliveryMethodId) {
  return DELIVERY_METHODS.find((m) => m.id === id) ?? DELIVERY_METHODS[0];
}
