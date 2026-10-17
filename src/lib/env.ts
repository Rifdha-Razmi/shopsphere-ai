/**
 * Typed access to public runtime configuration. Every configurable endpoint
 * or flag lives here (PRD §13) — never hard-code these elsewhere.
 */
function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  productApiUrl: (process.env.NEXT_PUBLIC_PRODUCT_API_URL || "https://dummyjson.com").replace(/\/$/, ""),
  sessionTtlMinutes: num(process.env.NEXT_PUBLIC_SESSION_TTL_MINUTES, 30),
  usdToInr: num(process.env.NEXT_PUBLIC_USD_TO_INR, 83),
} as const;
