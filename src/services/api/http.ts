import type { z } from "zod";
import { env } from "@/lib/env";

export type ApiErrorKind = "network" | "timeout" | "http" | "not-found" | "unauthorized" | "parse";

/**
 * Normalized error type. UI code only ever shows `userMessage` — raw error
 * objects and stack traces never reach the screen (PRD §13).
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly userMessage: string;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.userMessage = USER_MESSAGES[kind];
  }
}

const USER_MESSAGES: Record<ApiErrorKind, string> = {
  network: "We couldn't reach the store. Check your connection and try again.",
  timeout: "The store is taking too long to respond. Please try again.",
  http: "Something went wrong on our side. Please try again.",
  "not-found": "We couldn't find what you were looking for.",
  unauthorized: "Your session is no longer valid. Please sign in again.",
  parse: "We received unexpected data from the store. Please try again.",
};

export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) return error.userMessage;
  return "Something went wrong. Please try again.";
}

type TokenProvider = () => string | null;
let tokenProvider: TokenProvider = () => null;

/** The auth layer registers how to read the current token; the client attaches it. */
export function setAuthTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export interface RequestOptions<T> {
  schema: z.ZodType<T>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Attach the session token as a Bearer header. */
  auth?: boolean;
  baseUrl?: string;
}

export function buildUrl(path: string, params?: Record<string, string | number | undefined | null>, baseUrl = env.productApiUrl): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return `${baseUrl}${path}${qs ? `?${qs}` : ""}`;
}

export async function request<T>(url: string, options: RequestOptions<T>): Promise<T> {
  const { schema, method = "GET", body, signal, timeoutMs = 12000, auth = false } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error; // caller cancelled (e.g. TanStack Query) — propagate as-is
    const isTimeout = error instanceof DOMException && (error.name === "TimeoutError" || controller.signal.reason?.name === "TimeoutError");
    throw new ApiError(isTimeout ? "timeout" : "network", `Request to ${url} failed`);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  if (response.status === 404) throw new ApiError("not-found", `404 for ${url}`, 404);
  if (response.status === 401 || response.status === 403) throw new ApiError("unauthorized", `${response.status} for ${url}`, response.status);
  if (!response.ok) throw new ApiError("http", `${response.status} for ${url}`, response.status);

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError("parse", `Invalid JSON from ${url}`, response.status);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError("parse", `Unexpected response shape from ${url}: ${parsed.error.message}`, response.status);
  }
  return parsed.data;
}
