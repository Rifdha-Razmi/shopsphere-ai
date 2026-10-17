import { describe, expect, it } from "vitest";
import { respond, applyRefinements, runIntent } from "@/services/assistant/assistant.service";
import { parseMessage } from "@/services/assistant/intent-parser";
import { buildContext } from "@/services/recommendations/recommendation.service";
import { EMPTY_INTENT, type AssistantContext } from "@/types";
import { snapshotCatalog } from "../helpers/catalog";

const recCtx = buildContext({ catalog: snapshotCatalog, signals: { recentlyViewed: [], searchHistory: [], wishlist: [], cart: [], purchases: [] } });
const say = (text: string, context: AssistantContext | null) => respond({ text, context, catalog: snapshotCatalog, recommendationContext: recCtx });
const byId = new Map(snapshotCatalog.map((p) => [p.id, p]));

describe("assistant conversation", () => {
  it("MOD-AI-001 → MOD-AI-002: search then refine with better ratings", async () => {
    const first = await say("Show me headphones under 15000", null);
    expect(first.productIds.length).toBeGreaterThan(0);
    expect(first.appliedFilters).toEqual(expect.arrayContaining(["Category: headphones", "Max price: ₹15,000"]));
    for (const id of first.productIds) expect(byId.get(id)!.price).toBeLessThanOrEqual(15000);

    const second = await say("show me something with better ratings", first.context);
    expect(second.context.intent).toMatchObject({ categoryLabel: "headphones", maxPrice: 15000, minRating: 4 });
    for (const id of second.productIds) expect(byId.get(id)!.rating).toBeGreaterThanOrEqual(4);
  });

  it("'cheaper' lowers the price ceiling relative to shown results", async () => {
    const first = await say("smartphones under 100000", null);
    const cheaper = await say("show me something cheaper", first.context);
    expect(cheaper.context.intent!.maxPrice!).toBeLessThan(100000);
    const maxShown = Math.max(...cheaper.productIds.map((id) => byId.get(id)!.price));
    expect(maxShown).toBeLessThanOrEqual(cheaper.context.intent!.maxPrice!);
  });

  it("'more like the second one' uses the Similar strategy", async () => {
    const first = await say("laptops", null);
    const similar = await say("more like the second one", first.context);
    expect(similar.appliedFilters).toContain("Strategy: Similar Products");
    expect(similar.productIds).not.toContain(first.productIds[1]);
  });

  it("MOD-AI-003: unclear input asks for clarification with 2–3 prompts", async () => {
    const r = await say("hmm not sure", null);
    expect(r.productIds).toEqual([]);
    expect(r.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(r.suggestions.length).toBeLessThanOrEqual(3);
  });

  it("no matches → offers to loosen filters instead of unrelated products", async () => {
    const r = await say("laptops under 500", null);
    expect(r.productIds).toEqual([]);
    expect(r.suggestions[0]).toMatch(/laptops under/i);
  });

  it("topic change keeps the budget only when it still fits", async () => {
    const ctx: AssistantContext = { intent: { ...EMPTY_INTENT, categories: ["mobile-accessories"], categoryLabel: "headphones", maxPrice: 2000 }, lastResultIds: [] };
    const r = await say("never mind, show me laptops instead", ctx);
    expect(r.context.intent!.maxPrice).toBeNull();
    expect(r.text).toMatch(/removed/);
  });

  it("applyRefinements: better-rated raises an existing threshold", () => {
    const parsed = parseMessage("better ratings", { intent: { ...EMPTY_INTENT, categories: ["laptops"], minRating: 4 }, lastResultIds: [] });
    expect(applyRefinements(parsed, { ...EMPTY_INTENT, minRating: 4 }, []).minRating).toBe(4.3);
  });

  it("runIntent only returns in-stock products", () => {
    expect(runIntent({ ...EMPTY_INTENT, categories: ["smartphones"] }, snapshotCatalog).every((p) => p.stock > 0)).toBe(true);
  });
});
