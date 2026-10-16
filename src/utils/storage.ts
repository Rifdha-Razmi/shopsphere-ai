/**
 * Safe Web Storage access. Storage can throw (private mode, quota, disabled
 * cookies) — the app must keep working without it.
 */
export function safeGet<T>(key: string, fallback: T, storage: "local" | "session" = "local"): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function safeSet(key: string, value: unknown, storage: "local" | "session" = "local"): void {
  try {
    if (typeof window === "undefined") return;
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — non-fatal */
  }
}
