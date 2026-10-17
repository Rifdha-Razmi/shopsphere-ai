import type { Product, ProductId } from "./product";

export const RECOMMENDATION_STRATEGIES = [
  "recently-viewed",
  "similar",
  "category",
  "price",
  "wishlist",
  "cart",
  "frequently-bought",
  "trending",
  "personalized",
] as const;

export type RecommendationStrategy = (typeof RECOMMENDATION_STRATEGIES)[number];

export const STRATEGY_LABELS: Record<RecommendationStrategy, string> = {
  "recently-viewed": "Recently Viewed",
  similar: "Similar Products",
  category: "Category-Based",
  price: "Price-Based",
  wishlist: "Wishlist-Based",
  cart: "Cart-Based",
  "frequently-bought": "Frequently Bought Together",
  trending: "Trending",
  personalized: "Personalized For You",
};

export interface ViewEvent {
  productId: ProductId;
  at: number;
}

export interface PurchaseEvent {
  productId: ProductId;
  at: number;
}

/** Raw behavioural signals collected on the client (PRD §6.1). */
export interface RecommendationSignals {
  recentlyViewed: ViewEvent[];
  searchHistory: string[];
  wishlist: ProductId[];
  cart: ProductId[];
  purchases: PurchaseEvent[];
}

export interface PriceBand {
  min: number;
  max: number;
  median: number;
}

/** Signals distilled into weighted preferences — what the transparency panel shows. */
export interface SignalProfile {
  categoryAffinity: Record<string, number>;
  tagAffinity: Record<string, number>;
  brandAffinity: Record<string, number>;
  priceBand: PriceBand | null;
  viewedIds: ProductId[];
  wishlistIds: ProductId[];
  cartIds: ProductId[];
  purchasedIds: ProductId[];
  searchTerms: string[];
  /** 0–1. Low confidence blends personalization with general popularity (edge case 25). */
  confidence: number;
  totalSignals: number;
}

export interface ScoreBreakdown {
  categoryMatch: number;
  priceSimilarity: number;
  tagOverlap: number;
  normalizedRating: number;
  recentlyViewedRelation: number;
  wishlistRelation: number;
  cartRelation: number;
}

export interface ScoredProduct {
  product: Product;
  score: number;
  breakdown?: ScoreBreakdown;
  /** Human-readable reason, e.g. "Matches your interest in footwear". */
  reason?: string;
}

export interface RecommendationRequest {
  strategy: RecommendationStrategy;
  /** Seed product for similar / frequently-bought. */
  productId?: ProductId;
  /** Category for category-based. */
  category?: string;
  limit?: number;
  /** Product ids to exclude from results (e.g. the product currently on screen). */
  exclude?: ProductId[];
}

export interface RecommendationResult {
  strategy: RecommendationStrategy;
  /** Signal-transparent rail heading, e.g. "Because you viewed Running Shoes". */
  title: string;
  /** Short explanation of the signal behind the rail. */
  explanation: string;
  items: ScoredProduct[];
  /** True when the requested strategy had no candidates and Trending was used instead. */
  isFallback: boolean;
}

export interface RecommendationContext {
  catalog: Product[];
  signals: RecommendationSignals;
  /** Product co-occurrence pairs (seed + local orders) for frequently-bought-together. */
  coOccurrence: Record<string, number>;
  /** Seed popularity scores for trending. */
  popularity: Record<string, number>;
  now: number;
}

/**
 * The Provider contract (PRD §6.4). The Mock engine implements it today;
 * an ML/LLM-backed provider could implement the same interface later
 * without any change to the service or UI layers.
 */
export interface RecommendationProvider {
  readonly name: string;
  recommend(request: RecommendationRequest, context: RecommendationContext): Promise<RecommendationResult>;
  buildProfile(context: RecommendationContext): SignalProfile;
}
