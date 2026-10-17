import { describe, expect, it } from "vitest";
import { describeIntent, extractCategory, extractPrice, extractRating, extractReference, parseAmount, parseMessage } from "@/services/assistant/intent-parser";
import { EMPTY_INTENT, type AssistantContext } from "@/types";

const ctx = (intent: Partial<typeof EMPTY_INTENT>, ids = [1, 2, 3]): AssistantContext => ({ intent: { ...EMPTY_INTENT, ...intent }, lastResultIds: ids });

describe("parseAmount", () => {
  it("handles commas and k / lakh suffixes", () => {
    expect(parseAmount("30,000")).toBe(30000);
    expect(parseAmount("5", "k")).toBe(5000);
    expect(parseAmount("1.5", "lakh")).toBe(150000);
  });
});

describe("extractPrice", () => {
  it.each([
    ["under 30,000 rupees", { minPrice: null, maxPrice: 30000 }],
    ["below ₹5k", { minPrice: null, maxPrice: 5000 }],
    ["less than rs 999", { minPrice: null, maxPrice: 999 }],
    ["between 2000 and 5000", { minPrice: 2000, maxPrice: 5000 }],
    ["between 5000 and 2000", { minPrice: 2000, maxPrice: 5000 }],
    ["₹2,000 - ₹5,000", { minPrice: 2000, maxPrice: 5000 }],
    ["above 10000", { minPrice: 10000, maxPrice: null }],
    ["around 10000", { minPrice: 8000, maxPrice: 12000 }],
    ["show me phones", { minPrice: null, maxPrice: null }],
  ])("%s", (text, expected) => {
    expect(extractPrice(text)).toEqual(expected);
  });

  it("does not mistake star ratings for prices", () => {
    expect(extractPrice("above 4 stars")).toEqual({ minPrice: null, maxPrice: null });
  });
});

describe("extractRating", () => {
  it("maps qualitative and numeric ratings", () => {
    expect(extractRating("with good ratings")).toBe(4);
    expect(extractRating("highly rated")).toBe(4);
    expect(extractRating("best rated perfumes")).toBe(4.5);
    expect(extractRating("4.5 stars and up")).toBe(4.5);
    expect(extractRating("phones")).toBeNull();
  });
});

describe("extractCategory", () => {
  it("maps product types to catalogue categories + keywords", () => {
    expect(extractCategory("Show me headphones")).toMatchObject({ categories: ["mobile-accessories"], categoryLabel: "headphones" });
    expect(extractCategory("smartphones please").categories).toEqual(["smartphones"]);
    expect(extractCategory("watches").categories).toEqual(["mens-watches", "womens-watches"]);
  });
  it("narrows by gender", () => {
    expect(extractCategory("women's shoes")).toMatchObject({ categories: ["womens-shoes"], categoryLabel: "women's shoes" });
    expect(extractCategory("mens watches").categories).toEqual(["mens-watches"]);
  });
  it("prefers the longest phrase", () => {
    expect(extractCategory("smart speaker").categoryLabel).toBe("speakers");
  });
});

describe("parseMessage", () => {
  it("PRD §7.3 example: smartphones under 30,000 rupees with good ratings", () => {
    const parsed = parseMessage("Show me smartphones under 30,000 rupees with good ratings", null);
    expect(parsed.kind).toBe("search");
    expect(parsed.intent).toMatchObject({ categories: ["smartphones"], maxPrice: 30000, minRating: 4 });
  });

  it("MOD-AI-001: headphones under 5000", () => {
    const parsed = parseMessage("Show me headphones under 5000", null);
    expect(parsed.intent).toMatchObject({ categoryLabel: "headphones", maxPrice: 5000 });
  });

  it("MOD-AI-002: 'better ratings' keeps category and price", () => {
    const parsed = parseMessage("show me something with better ratings", ctx({ categories: ["mobile-accessories"], categoryLabel: "headphones", maxPrice: 5000 }));
    expect(parsed.kind).toBe("refine");
    expect(parsed.refinements).toContain("better-rated");
    expect(parsed.intent).toMatchObject({ categoryLabel: "headphones", maxPrice: 5000 });
  });

  it("'cheaper' is a refinement", () => {
    const parsed = parseMessage("Show me something cheaper", ctx({ categories: ["smartphones"], maxPrice: 30000 }));
    expect(parsed.kind).toBe("refine");
    expect(parsed.refinements).toEqual(["cheaper"]);
  });

  it("'only in blue' adds a colour attribute", () => {
    const parsed = parseMessage("only in blue", ctx({ categories: ["smartphones"] }));
    expect(parsed.kind).toBe("refine");
    expect(parsed.intent.color).toBe("Blue");
  });

  it("'more like the second one' references result #2", () => {
    const parsed = parseMessage("Show me more like the second one", ctx({ categories: ["smartphones"] }));
    expect(parsed.kind).toBe("similar");
    expect(parsed.referenceIndex).toBe(2);
  });

  it("detects a topic change", () => {
    const parsed = parseMessage("Never mind, show me headphones instead", ctx({ categories: ["laptops"], maxPrice: 50000 }));
    expect(parsed.kind).toBe("topic-change");
    expect(parsed.intent.categoryLabel).toBe("headphones");
  });

  it("MOD-AI-003: unclear input is 'unknown', not a guess", () => {
    expect(parseMessage("hmm not sure", null).kind).toBe("unknown");
    expect(parseMessage("", null).kind).toBe("unknown");
  });

  it("greetings and help", () => {
    expect(parseMessage("hello!", null).kind).toBe("greeting");
    expect(parseMessage("what can you do", null).kind).toBe("help");
  });

  it("extracts known brands", () => {
    const parsed = parseMessage("apple laptops", null, { brands: ["Apple", "Asus"] });
    expect(parsed.intent).toMatchObject({ brand: "Apple", categories: ["laptops"] });
  });
});

describe("extractReference / describeIntent", () => {
  it("parses ordinals and numbers", () => {
    expect(extractReference("more like the third one", 6)).toBe(3);
    expect(extractReference("similar to #4", 6)).toBe(4);
    expect(extractReference("like the last one", 5)).toBe(5);
    expect(extractReference("the second one", 5)).toBeNull();
  });
  it("describes filters in plain language", () => {
    expect(describeIntent({ ...EMPTY_INTENT, categoryLabel: "headphones", maxPrice: 5000, minRating: 4 })).toEqual(["Category: headphones", "Max price: ₹5,000", "Rating: 4★ & up"]);
  });
});
