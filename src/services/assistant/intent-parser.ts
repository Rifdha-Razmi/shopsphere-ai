import { EMPTY_INTENT, type AssistantContext, type ParsedMessage, type RefinementKind, type ShoppingIntent } from "@/types";
import { normalizeText } from "@/utils/text";
import { CATEGORY_LEXICON, COLORS, GENDER_WORDS } from "./lexicon";

/**
 * Rule-based structured intent extraction (PRD §7.3–7.5). Pure: text in,
 * structured intent out. No language model is involved.
 */

export interface ParserOptions {
  /** Known brand names (lowercase) for brand extraction. */
  brands?: string[];
}

// ---------- amounts ----------

const AMOUNT = String.raw`(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lakhs|lac|l)?\s*(?:rupees|rs|inr|bucks)?`;

export function parseAmount(num: string, unit?: string): number {
  const value = Number(num.replace(/,/g, ""));
  if (!Number.isFinite(value)) return NaN;
  const u = unit?.toLowerCase();
  if (u === "k" || u === "thousand") return value * 1000;
  if (u === "lakh" || u === "lakhs" || u === "lac" || u === "l") return value * 100000;
  return value;
}

export function extractPrice(raw: string): { minPrice: number | null; maxPrice: number | null } {
  const text = raw.toLowerCase().replace(/₹\s*/g, "₹");
  let m = text.match(new RegExp(String.raw`between\s+${AMOUNT}\s+(?:and|to|-)\s+${AMOUNT}`));
  if (m) return order(parseAmount(m[1], m[2] ?? m[4]), parseAmount(m[3], m[4]));
  m = text.match(new RegExp(String.raw`${AMOUNT}\s*(?:-|to|–)\s*${AMOUNT}`));
  if (m && (m[2] || m[4] || /₹|rs|inr|rupees|price|budget/.test(text))) return order(parseAmount(m[1], m[2] ?? m[4]), parseAmount(m[3], m[4]));
  m = text.match(new RegExp(String.raw`(?:under|below|less than|lesser than|within|upto|up to|max(?:imum)?|not more than|cheaper than|budget(?: of| is)?|<)\s*${AMOUNT}`));
  if (m) return { minPrice: null, maxPrice: parseAmount(m[1], m[2]) };
  m = text.match(new RegExp(String.raw`(?:above|over|more than|at least|min(?:imum)?|starting(?: from| at)?|>)\s*${AMOUNT}`));
  if (m && !/\bstars?\b/.test(text.slice(m.index ?? 0, (m.index ?? 0) + m[0].length + 8))) return { minPrice: parseAmount(m[1], m[2]), maxPrice: null };
  m = text.match(new RegExp(String.raw`(?:around|about|approx(?:imately)?|roughly|near)\s*${AMOUNT}`));
  if (m) {
    const v = parseAmount(m[1], m[2]);
    return { minPrice: Math.round(v * 0.8), maxPrice: Math.round(v * 1.2) };
  }
  return { minPrice: null, maxPrice: null };
}

function order(a: number, b: number) {
  return a <= b ? { minPrice: a, maxPrice: b } : { minPrice: b, maxPrice: a };
}

// ---------- rating ----------

export function extractRating(text: string): number | null {
  const t = text.toLowerCase();
  const stars = t.match(/(\d(?:\.\d)?)\s*\+?\s*(?:stars?|★)/) ?? t.match(/rat(?:ed|ing)\s*(?:of\s*)?(?:above|over|at least)?\s*(\d(?:\.\d)?)/);
  if (stars) {
    const v = Number(stars[1]);
    if (v >= 1 && v <= 5) return v;
  }
  if (/\b(best|top|highest|excellent)[\s-]*(rated|ratings?|reviewed|reviews?)\b|\bthe best\b/.test(t)) return 4.5;
  if (/\b(good|great|high|nice|decent|well|positive)[\s-]*(rated|ratings?|reviewed|reviews?)\b|\bhighly rated\b/.test(t)) return 4;
  return null;
}

// ---------- category / colour / brand ----------

function containsPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text);
}

export function extractCategory(text: string): Pick<ShoppingIntent, "categories" | "categoryLabel" | "keywords"> {
  const norm = normalizeText(text.replace(/['’]s\b/g, "s"));
  let best: { len: number; entry: (typeof CATEGORY_LEXICON)[number] } | null = null;
  for (const entry of CATEGORY_LEXICON) {
    for (const phrase of entry.phrases) {
      if (phrase.length > (best?.len ?? 0) && containsPhrase(norm, phrase)) best = { len: phrase.length, entry };
    }
  }
  if (!best) return { categories: [], categoryLabel: null, keywords: [] };
  let categories = [...best.entry.categories];
  let label = best.entry.label;
  const words = norm.split(" ");
  const isMen = GENDER_WORDS.men.some((w) => words.includes(w));
  const isWomen = GENDER_WORDS.women.some((w) => words.includes(w));
  if (isMen !== isWomen) {
    const prefix = isMen ? "mens-" : "womens-";
    const narrowed = categories.filter((c) => c.startsWith(prefix));
    if (narrowed.length) categories = narrowed;
    else if (isWomen && label === "shirts") categories = ["tops"];
    label = `${isMen ? "men's" : "women's"} ${label}`;
  }
  return { categories, categoryLabel: label, keywords: best.entry.keywords ?? [] };
}

export function extractColor(text: string): string | null {
  const words = normalizeText(text).split(" ");
  const found = COLORS.find((c) => words.includes(c));
  if (!found) return null;
  return found === "gray" ? "Grey" : found.charAt(0).toUpperCase() + found.slice(1);
}

export function extractBrand(text: string, brands: string[] = []): string | null {
  const norm = normalizeText(text);
  const sorted = [...brands].sort((a, b) => b.length - a.length);
  for (const brand of sorted) {
    const b = normalizeText(brand);
    if (b.length >= 3 && b !== "generic" && containsPhrase(norm, b)) return brand;
  }
  return null;
}

// ---------- conversational cues ----------

const ORDINALS: Record<string, number> = { first: 1, "1st": 1, one: 1, second: 2, "2nd": 2, two: 2, third: 3, "3rd": 3, three: 3, fourth: 4, "4th": 4, four: 4, fifth: 5, "5th": 5, five: 5, sixth: 6, "6th": 6, six: 6 };

export function extractReference(text: string, lastCount: number): number | null {
  const t = text.toLowerCase();
  if (!/\b(like|similar|same as|more of)\b/.test(t)) return null;
  const m = t.match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th)\b/) ?? t.match(/(?:#|number|no\.?|item)\s*(\d)\b/);
  if (m) return ORDINALS[m[1]] ?? Number(m[1]);
  if (/\b(last|final) one\b/.test(t)) return lastCount || null;
  if (/\bthat one\b|\bthis one\b/.test(t)) return 1;
  return null;
}

function detectRefinements(text: string): RefinementKind[] {
  const t = text.toLowerCase();
  const out: RefinementKind[] = [];
  if (/\b(cheaper|less expensive|lower price|more affordable|too expensive|too costly|on a budget|budget friendly|lower budget)\b/.test(t)) out.push("cheaper");
  if (/\b(more expensive|pricier|costlier|premium|higher end|high end|fancier|luxury)\b/.test(t)) out.push("pricier");
  if (/\b(better|higher|best|top)[\s-]*(rated|ratings?|reviews?|reviewed)\b|\bmore reviews\b|\bbetter quality\b/.test(t)) out.push("better-rated");
  if (/\b(only|just)\s+(in\s+)?[a-z]+\b/.test(t) && extractColor(t)) out.push("attribute");
  if (/\b(sort|order)\b.*\b(price|rating|cheapest|expensive)\b|\bcheapest first\b|\blowest price first\b/.test(t)) out.push("sort");
  return out;
}

const TOPIC_CHANGE = /\b(never ?mind|nevermind|instead|forget (that|it|this)|actually|what about|how about|switch to|change to)\b/;
const GREETING = /^(hi|hii+|hello|hey|hola|vanakkam|namaste|good (morning|afternoon|evening))\b[\s!.]*$/;
const HELP = /\b(help|what can you do|how does this work|who are you|what are you)\b/;
const SHOW_VERBS = /\b(show|find|search|looking for|look for|need|want|get|buy|recommend|suggest|any)\b/;

/**
 * Parses one customer message against the conversation context.
 */
export function parseMessage(text: string, context: AssistantContext | null, options: ParserOptions = {}): ParsedMessage {
  const raw = text.trim().slice(0, 300);
  const norm = normalizeText(raw);
  const prev = context?.intent ?? null;
  const base: ParsedMessage = { kind: "unknown", intent: { ...EMPTY_INTENT }, refinements: [], referenceIndex: null, confidence: 0 };
  if (!norm) return base;
  if (GREETING.test(norm)) return { ...base, kind: "greeting", confidence: 1 };

  const cat = extractCategory(raw);
  const price = extractPrice(raw);
  const minRating = extractRating(raw);
  const color = extractColor(raw);
  const brand = extractBrand(raw, options.brands);
  const refinements = detectRefinements(raw);
  const referenceIndex = extractReference(raw, context?.lastResultIds.length ?? 0);

  const hasConstraint = price.minPrice !== null || price.maxPrice !== null || minRating !== null || color !== null || brand !== null;
  const sort: ShoppingIntent["sort"] = /\b(cheapest|lowest price|low to high)\b/.test(norm) ? "price-asc" : /\b(most expensive|high to low)\b/.test(norm) ? "price-desc" : minRating ? "rating" : "relevance";

  // "Show me more like the second one"
  if (referenceIndex !== null && prev && context?.lastResultIds.length) {
    return { kind: "similar", intent: { ...prev }, refinements: [], referenceIndex, confidence: 0.9 };
  }

  const fresh: ShoppingIntent = {
    ...EMPTY_INTENT,
    ...cat,
    minPrice: price.minPrice,
    maxPrice: price.maxPrice,
    minRating,
    color,
    brand,
    sort,
  };

  // "Never mind, show me headphones instead"
  if (prev && cat.categories.length && TOPIC_CHANGE.test(norm)) {
    return { kind: "topic-change", intent: fresh, refinements, referenceIndex: null, confidence: 0.9 };
  }

  // A new category → a new, self-contained search.
  if (cat.categories.length) {
    return { kind: "search", intent: fresh, refinements, referenceIndex: null, confidence: Math.min(1, 0.6 + 0.1 * Number(hasConstraint) + 0.1 * Number(SHOW_VERBS.test(norm))) };
  }

  // Follow-ups that only adjust constraints: "cheaper", "under 3000", "only in blue".
  if (prev && (refinements.length || hasConstraint)) {
    const merged: ShoppingIntent = {
      ...prev,
      minPrice: price.minPrice ?? prev.minPrice,
      maxPrice: price.maxPrice ?? prev.maxPrice,
      minRating: minRating ?? prev.minRating,
      color: color ?? prev.color,
      brand: brand ?? prev.brand,
      sort: sort !== "relevance" ? sort : prev.sort,
    };
    const kinds = refinements.length ? refinements : (["attribute"] as RefinementKind[]);
    return { kind: "refine", intent: merged, refinements: kinds, referenceIndex: null, confidence: 0.85 };
  }

  // Brand-only or constraint-only queries with no context: search the whole catalogue.
  if (brand || (hasConstraint && SHOW_VERBS.test(norm))) {
    return { kind: "search", intent: fresh, refinements, referenceIndex: null, confidence: 0.55 };
  }

  if (HELP.test(norm)) return { ...base, kind: "help", confidence: 1 };
  return base;
}

export function describeIntent(intent: ShoppingIntent): string[] {
  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const out: string[] = [];
  if (intent.categoryLabel) out.push(`Category: ${intent.categoryLabel}`);
  if (intent.brand) out.push(`Brand: ${intent.brand}`);
  if (intent.minPrice !== null && intent.maxPrice !== null) out.push(`Price: ${fmt(intent.minPrice)}–${fmt(intent.maxPrice)}`);
  else if (intent.maxPrice !== null) out.push(`Max price: ${fmt(intent.maxPrice)}`);
  else if (intent.minPrice !== null) out.push(`Min price: ${fmt(intent.minPrice)}`);
  if (intent.minRating !== null) out.push(`Rating: ${intent.minRating}★ & up`);
  if (intent.color) out.push(`Colour: ${intent.color}`);
  if (intent.sort === "price-asc") out.push("Sorted: price low → high");
  if (intent.sort === "price-desc") out.push("Sorted: price high → low");
  if (intent.sort === "rating") out.push("Sorted: best rated");
  return out;
}
