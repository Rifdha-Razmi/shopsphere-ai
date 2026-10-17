import type { ProductId } from "./product";

/** Structured shopping intent extracted from free text (PRD §7.3). */
export interface ShoppingIntent {
  /** One or more catalogue categories (e.g. "watches" maps to men's and women's watches). */
  categories: string[];
  /** Human label for what the customer asked for, e.g. "headphones". */
  categoryLabel: string | null;
  /** Extra keyword constraints, e.g. ["headphones"] when a "category" is really a product type. */
  keywords: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  color: string | null;
  brand: string | null;
  sort: "relevance" | "price-asc" | "price-desc" | "rating";
}

export const EMPTY_INTENT: ShoppingIntent = {
  categories: [],
  categoryLabel: null,
  keywords: [],
  minPrice: null,
  maxPrice: null,
  minRating: null,
  color: null,
  brand: null,
  sort: "relevance",
};

export type ParsedMessageKind =
  | "search" // a new, self-contained query
  | "refine" // modifies the previous intent
  | "similar" // "more like the second one"
  | "topic-change" // "never mind, show me X instead"
  | "greeting"
  | "help"
  | "unknown";

export type RefinementKind = "cheaper" | "pricier" | "better-rated" | "attribute" | "sort";

export interface ParsedMessage {
  kind: ParsedMessageKind;
  intent: ShoppingIntent;
  refinements: RefinementKind[];
  /** 1-based index into the last result set ("the second one"). */
  referenceIndex: number | null;
  confidence: number;
}

export interface AssistantContext {
  intent: ShoppingIntent | null;
  lastResultIds: ProductId[];
}

export interface AssistantReply {
  text: string;
  /** Plain-language list of filters applied, shown under the reply. */
  appliedFilters: string[];
  productIds: ProductId[];
  suggestions: string[];
  context: AssistantContext;
  parsed: ParsedMessage;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  appliedFilters?: string[];
  productIds?: ProductId[];
  suggestions?: string[];
  status?: "ok" | "error";
}
