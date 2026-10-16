import type { RecommendationStrategy } from "@/types";
import { RECOMMENDATION_STRATEGIES } from "@/types";
import seed from "@/mocks/analytics.json";

/** Recommendation analytics (PRD §8.4). All data is local + seeded — "Local Analytics". */

export interface StrategyCounters {
  impressions: number;
  clicks: number;
  addToCart: number;
}

export type AnalyticsCounters = Record<RecommendationStrategy, StrategyCounters>;

export function emptyCounters(): AnalyticsCounters {
  return Object.fromEntries(RECOMMENDATION_STRATEGIES.map((s) => [s, { impressions: 0, clicks: 0, addToCart: 0 }])) as AnalyticsCounters;
}

export function seedCounters(): AnalyticsCounters {
  const base = emptyCounters();
  const seeded = seed.byStrategy as Partial<Record<RecommendationStrategy, StrategyCounters>>;
  for (const s of RECOMMENDATION_STRATEGIES) if (seeded[s]) base[s] = { ...seeded[s]! };
  return base;
}

export function combine(a: AnalyticsCounters, b: AnalyticsCounters): AnalyticsCounters {
  const out = emptyCounters();
  for (const s of RECOMMENDATION_STRATEGIES) {
    out[s] = { impressions: a[s].impressions + b[s].impressions, clicks: a[s].clicks + b[s].clicks, addToCart: a[s].addToCart + b[s].addToCart };
  }
  return out;
}

export interface AnalyticsSummary {
  impressions: number;
  clicks: number;
  addToCart: number;
  ctr: number;
  conversion: number;
  byStrategy: { strategy: RecommendationStrategy; impressions: number; clicks: number; addToCart: number; ctr: number; conversion: number; engagementShare: number }[];
}

export function summarize(counters: AnalyticsCounters): AnalyticsSummary {
  const rows = RECOMMENDATION_STRATEGIES.map((strategy) => {
    const c = counters[strategy];
    return { strategy, ...c, ctr: c.impressions ? c.clicks / c.impressions : 0, conversion: c.clicks ? c.addToCart / c.clicks : 0, engagementShare: 0 };
  });
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const addToCart = rows.reduce((s, r) => s + r.addToCart, 0);
  for (const r of rows) r.engagementShare = clicks ? r.clicks / clicks : 0;
  return { impressions, clicks, addToCart, ctr: impressions ? clicks / impressions : 0, conversion: clicks ? addToCart / clicks : 0, byStrategy: rows.sort((a, b) => b.clicks - a.clicks) };
}

export const SIMULATED = seed.simulated;
