import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useAnalyticsStore } from "@/store/analytics.store";
import { useUiStore } from "@/store/ui.store";
import { combine, emptyCounters, seedCounters, summarize } from "@/services/analytics/analytics.service";
import { RuleBasedAssistantProvider } from "@/services/assistant/provider";
import { buildContext } from "@/services/recommendations/recommendation.service";
import { levenshtein, suggestSpellings, truncate } from "@/utils/text";
import { formatCompact, formatPrice, humanizeSlug } from "@/lib/format";
import { makeProduct } from "../helpers/factories";
import { snapshotCatalog } from "../helpers/catalog";

beforeEach(() => {
  useCartStore.setState({ items: [], saved: [], couponCode: null, accountCarts: {}, ownerId: null });
  useWishlistStore.setState({ items: [], accountLists: {}, ownerId: null });
  useAnalyticsStore.getState().reset();
  useUiStore.setState({ compareIds: [] });
});

describe("cart store", () => {
  it("clamps adds to stock and refuses out-of-stock items", () => {
    const p = makeProduct({ id: 1, stock: 2 });
    expect(useCartStore.getState().add(p, null, 5)).toMatchObject({ ok: true, quantity: 2, clamped: true });
    expect(useCartStore.getState().add(makeProduct({ id: 2, stock: 0 }), null)).toMatchObject({ ok: false });
  });

  it("save for later and move back", () => {
    const p = makeProduct({ id: 1 });
    const { add, saveForLater, moveToCart } = useCartStore.getState();
    add(p, null);
    saveForLater("1:default");
    expect(useCartStore.getState()).toMatchObject({ items: [], saved: [expect.objectContaining({ productId: 1 })] });
    moveToCart("1:default");
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it("guest cart merges into the account cart on login and stays with the account on logout", () => {
    const s = useCartStore.getState();
    s.add(makeProduct({ id: 1 }), null);
    s.switchOwner("u1");
    expect(useCartStore.getState().items).toHaveLength(1);
    useCartStore.getState().add(makeProduct({ id: 2 }), null);
    useCartStore.getState().switchOwner(null);
    expect(useCartStore.getState().items).toHaveLength(0);
    useCartStore.getState().switchOwner("u1");
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual([1, 2]);
  });

  it("validates coupons against the subtotal", () => {
    expect(useCartStore.getState().applyCoupon("FLAT500", 100).ok).toBe(false);
    expect(useCartStore.getState().applyCoupon("FLAT500", 6000).ok).toBe(true);
    expect(useCartStore.getState().couponCode).toBe("FLAT500");
  });
});

describe("wishlist + compare + analytics stores", () => {
  it("toggles wishlist items", () => {
    const p = makeProduct({ id: 9 });
    expect(useWishlistStore.getState().toggle(p)).toBe(true);
    expect(useWishlistStore.getState().has(9)).toBe(true);
    expect(useWishlistStore.getState().toggle(p)).toBe(false);
  });

  it("limits comparison to four products", () => {
    const t = useUiStore.getState().toggleCompare;
    [1, 2, 3, 4].forEach((id) => t(id));
    expect(t(5)).toMatchObject({ ok: false });
  });

  it("attributes add-to-cart to the clicked recommendation strategy", () => {
    const a = useAnalyticsStore.getState();
    a.recordImpression("similar", 8);
    a.recordClick("similar", 42);
    useAnalyticsStore.getState().recordAddToCart(42);
    useAnalyticsStore.getState().recordAddToCart(42); // only counted once
    expect(useAnalyticsStore.getState().counters.similar).toEqual({ impressions: 8, clicks: 1, addToCart: 1 });
  });

  it("summarizes CTR and conversion", () => {
    const c = emptyCounters();
    c.trending = { impressions: 100, clicks: 10, addToCart: 5 };
    const s = summarize(combine(c, emptyCounters()));
    expect(s).toMatchObject({ ctr: 0.1, conversion: 0.5 });
    expect(s.byStrategy[0].strategy).toBe("trending");
    expect(summarize(seedCounters()).impressions).toBeGreaterThan(0);
  });
});

describe("assistant provider + utils", () => {
  it("rule-based provider responds through the provider boundary", async () => {
    const reply = await new RuleBasedAssistantProvider(0).respond({
      text: "perfumes under 5000",
      context: null,
      catalog: snapshotCatalog,
      recommendationContext: buildContext({ catalog: snapshotCatalog, signals: { recentlyViewed: [], searchHistory: [], wishlist: [], cart: [], purchases: [] } }),
    });
    expect(reply.productIds.length).toBeGreaterThan(0);
  });

  it("spelling suggestions and formatting", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(suggestSpellings("lapotp", ["laptop", "laptops", "lamp"])).toContain("laptop");
    expect(suggestSpellings("ab", ["abc"])).toEqual([]);
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(formatPrice(123456)).toBe("₹1,23,456");
    expect(formatCompact(13000)).toBe("13K");
    expect(humanizeSlug("mens-shoes")).toBe("Mens Shoes");
  });
});

describe("cart selection — buy only the ticked items", () => {
  it("new items start ticked; unticking, select-all and removing bought lines work", () => {
    const a = makeProduct({ id: 901, title: "A", stock: 5 });
    const b = makeProduct({ id: 902, title: "B", stock: 5 });
    useCartStore.setState({ items: [], saved: [], couponCode: "WELCOME10", deselected: [] });
    useCartStore.getState().add(a, null, 1);
    useCartStore.getState().add(b, null, 1);
    const [ka, kb] = useCartStore.getState().items.map((i) => i.key);
    expect(useCartStore.getState().deselected).toEqual([]);

    useCartStore.getState().setSelected(kb, false);
    expect(useCartStore.getState().deselected).toEqual([kb]);
    useCartStore.getState().setAllSelected(false);
    expect(useCartStore.getState().deselected.sort()).toEqual([ka, kb].sort());
    useCartStore.getState().setAllSelected(true);
    expect(useCartStore.getState().deselected).toEqual([]);

    // Order placed for A only: B stays, coupon is used up.
    useCartStore.getState().setSelected(kb, false);
    useCartStore.getState().removeOrdered([ka]);
    expect(useCartStore.getState().items.map((i) => i.key)).toEqual([kb]);
    expect(useCartStore.getState().couponCode).toBeNull();

    // Removing a line also forgets its unticked state.
    useCartStore.getState().remove(kb);
    expect(useCartStore.getState().deselected).toEqual([]);
  });
});
