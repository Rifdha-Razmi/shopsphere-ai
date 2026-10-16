import type { AssistantContext, AssistantReply, ParsedMessage, Product, RecommendationContext, ShoppingIntent } from "@/types";
import { EMPTY_FILTERS } from "@/types";
import { filterProducts, sortProducts } from "@/services/catalog/filter";
import { getRecommendations } from "@/services/recommendations/recommendation.service";
import { median } from "@/utils/math";
import { describeIntent, parseMessage } from "./intent-parser";
import { STARTER_PROMPTS } from "./lexicon";

/**
 * Rule-Based / Mock AI Shopping Assistant (PRD §7). Executes structured intent
 * against the SAME filtering infrastructure as product discovery, and the SAME
 * recommendation service for similarity requests.
 */

export const RESULT_LIMIT = 6;
export const CHEAPER_FACTOR = 0.8;
export const RATING_STEP = 0.3;

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function intentToFilters(intent: ShoppingIntent) {
  return {
    filters: {
      ...EMPTY_FILTERS,
      categories: intent.categories,
      brands: intent.brand ? [intent.brand] : [],
      minPrice: intent.minPrice,
      maxPrice: intent.maxPrice,
      minRating: intent.minRating,
      availability: "in-stock" as const,
      color: intent.color,
    },
    keywords: intent.keywords,
  };
}

export function runIntent(intent: ShoppingIntent, catalog: Product[]): Product[] {
  const { filters, keywords } = intentToFilters(intent);
  const matches = filterProducts(catalog, filters, { keywords });
  const sorted =
    intent.sort === "relevance"
      ? [...matches].sort((a, b) => b.rating - a.rating || a.price - b.price)
      : sortProducts(matches, intent.sort === "rating" ? "rating" : intent.sort);
  return sorted;
}

/** Applies comparative refinements relative to the previously shown results (PRD §7.4). */
export function applyRefinements(parsed: ParsedMessage, previous: ShoppingIntent | null, lastShown: Product[]): ShoppingIntent {
  const intent = { ...parsed.intent };
  const prices = lastShown.map((p) => p.price);
  for (const r of parsed.refinements) {
    if (r === "cheaper") {
      // Drop to the lower of: 80% of the current ceiling, or the median of what was shown.
      const candidates = [previous?.maxPrice != null ? previous.maxPrice * CHEAPER_FACTOR : Infinity, prices.length ? median(prices) : Infinity];
      const ceiling = Math.min(...candidates);
      intent.maxPrice = Number.isFinite(ceiling) ? Math.max(1, Math.round(ceiling)) : intent.maxPrice;
      intent.sort = "relevance";
    }
    if (r === "pricier") {
      intent.minPrice = prices.length ? Math.round(median(prices)) : intent.minPrice;
      intent.maxPrice = null;
      intent.sort = "relevance";
    }
    if (r === "better-rated") {
      const current = previous?.minRating ?? null;
      intent.minRating = current === null ? 4 : Math.min(4.8, Math.round((current + RATING_STEP) * 10) / 10);
      intent.sort = "rating";
    }
  }
  return intent;
}

function relaxSuggestions(intent: ShoppingIntent, catalog: Product[]): string[] {
  const label = intent.categoryLabel ?? "products";
  const out: string[] = [];
  const pool = runIntent({ ...intent, maxPrice: null, minPrice: null, minRating: null, color: null }, catalog);
  if (intent.maxPrice !== null && pool.length) {
    const cheapest = Math.min(...pool.map((p) => p.price));
    out.push(`Show ${label} under ${fmt(Math.max(cheapest * 1.3, intent.maxPrice * 1.5))}`);
  }
  if (intent.minRating !== null) out.push(`Show ${label} with any rating`);
  if (intent.color) out.push(`Show ${label} in any colour`);
  if (!out.length) out.push(...STARTER_PROMPTS.slice(0, 2));
  return out.slice(0, 3);
}

export interface RespondInput {
  text: string;
  context: AssistantContext | null;
  catalog: Product[];
  recommendationContext: RecommendationContext;
}

export async function respond({ text, context, catalog, recommendationContext }: RespondInput): Promise<AssistantReply> {
  const live = catalog.filter((p) => !p.archived);
  const brands = Array.from(new Set(live.map((p) => p.brand)));
  const parsed = parseMessage(text, context, { brands });
  const byId = new Map(live.map((p) => [p.id, p]));
  const lastShown = (context?.lastResultIds ?? []).map((id) => byId.get(id)).filter((p): p is Product => !!p);
  const keep = (ctx: Partial<AssistantContext> = {}): AssistantContext => ({ intent: context?.intent ?? null, lastResultIds: context?.lastResultIds ?? [], ...ctx });

  if (parsed.kind === "greeting") {
    return { text: "Hi! I'm the ShopSphere shopping assistant. Tell me what you're looking for — a product type, a budget, or a rating — and I'll find matches.", appliedFilters: [], productIds: [], suggestions: STARTER_PROMPTS.slice(0, 3), context: keep(), parsed };
  }
  if (parsed.kind === "help") {
    return {
      text: "I'm a rule-based assistant (no AI language model). I understand product types, budgets like \"under ₹5,000\" or \"between 2k and 5k\", ratings like \"good ratings\" or \"4 stars\", colours, and brands. After a search you can say \"cheaper\", \"better ratings\", \"only in blue\" or \"more like the second one\".",
      appliedFilters: [],
      productIds: [],
      suggestions: STARTER_PROMPTS.slice(0, 3),
      context: keep(),
      parsed,
    };
  }
  if (parsed.kind === "unknown") {
    return {
      text: "I'm not sure what you're looking for yet. Could you tell me a product type, and optionally a budget or rating? For example:",
      appliedFilters: [],
      productIds: [],
      suggestions: STARTER_PROMPTS.slice(0, 3),
      context: keep(),
      parsed,
    };
  }

  // "More like the second one" → Similar Products strategy seeded with that product.
  if (parsed.kind === "similar") {
    const seed = lastShown[(parsed.referenceIndex ?? 1) - 1];
    if (!seed) {
      return { text: `I only showed ${lastShown.length} item${lastShown.length === 1 ? "" : "s"} last time — which one did you mean?`, appliedFilters: [], productIds: [], suggestions: lastShown.slice(0, 3).map((_, i) => `More like number ${i + 1}`), context: keep(), parsed };
    }
    const result = await getRecommendations({ strategy: "similar", productId: seed.id, limit: RESULT_LIMIT }, recommendationContext);
    const ids = result.items.map((i) => i.product.id);
    return {
      text: ids.length ? `Here are products similar to ${seed.title} — matched on category, tags and price.` : `I couldn't find close matches for ${seed.title}.`,
      appliedFilters: [`Similar to: ${seed.title}`, "Strategy: Similar Products"],
      productIds: ids,
      suggestions: ids.length ? ["Show me something cheaper", "Something with better ratings"] : STARTER_PROMPTS.slice(0, 2),
      context: { intent: context?.intent ?? null, lastResultIds: ids },
      parsed,
    };
  }

  let intent = parsed.intent;
  let note = "";
  if (parsed.kind === "refine") intent = applyRefinements(parsed, context?.intent ?? null, lastShown);
  if (parsed.kind === "topic-change" && context?.intent) {
    // Reset category context; keep general preferences (rating, and price band when it still makes sense).
    const prev = context.intent;
    intent = { ...intent, minRating: intent.minRating ?? prev.minRating };
    if (intent.maxPrice === null && intent.minPrice === null && (prev.maxPrice !== null || prev.minPrice !== null)) {
      const withBudget = runIntent({ ...intent, minPrice: prev.minPrice, maxPrice: prev.maxPrice }, live);
      if (withBudget.length) {
        intent = { ...intent, minPrice: prev.minPrice, maxPrice: prev.maxPrice };
        note = " I kept your budget from before.";
      } else {
        note = " Your earlier budget doesn't fit this category, so I've removed it.";
      }
    }
  }

  const matches = runIntent(intent, live);
  const shown = matches.slice(0, RESULT_LIMIT);
  const applied = describeIntent(intent);
  const label = intent.categoryLabel ?? (intent.brand ? `${intent.brand} products` : "products");

  if (shown.length === 0) {
    return {
      text: `I couldn't find any ${label} matching all of that. Want me to loosen a filter?`,
      appliedFilters: applied,
      productIds: [],
      suggestions: relaxSuggestions(intent, live),
      context: { intent, lastResultIds: [] },
      parsed,
    };
  }

  const lead =
    parsed.kind === "refine"
      ? parsed.refinements.includes("cheaper")
        ? `Here are cheaper ${label}${intent.maxPrice ? ` under ${fmt(intent.maxPrice)}` : ""}.`
        : parsed.refinements.includes("better-rated")
          ? `Here are better-rated ${label} (${intent.minRating}★ and up), keeping your other filters.`
          : parsed.refinements.includes("pricier")
            ? `Here are more premium ${label}.`
            : `Updated — here are ${label} with your new filter.`
      : `Here ${shown.length === 1 ? "is" : "are"} ${matches.length > shown.length ? `the top ${shown.length} of ${matches.length}` : shown.length} ${label}.`;

  return {
    text: lead + note,
    appliedFilters: applied,
    productIds: shown.map((p) => p.id),
    suggestions: ["Show me something cheaper", "Something with better ratings", "More like the first one"],
    context: { intent, lastResultIds: shown.map((p) => p.id) },
    parsed,
  };
}
