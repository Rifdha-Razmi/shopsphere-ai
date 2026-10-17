import { describe, expect, it } from "vitest";
import { authenticate, createSession, createToken, decodeToken, isSessionValid, refreshSession, registerUser, AuthError } from "@/services/auth/auth.service";
import { advanceOrder, autoProgress, buildTimeline, loadFixtureOrders, nextStatus } from "@/services/orders/orders.service";
import { isVerified, sortReviews, summarizeRatings } from "@/services/reviews/reviews.service";
import { estimateDelivery } from "@/services/delivery/delivery.service";
import { buildOrder, simulatePayment } from "@/services/checkout/checkout.service";
import { safeNext } from "@/lib/safe-redirect";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { ORDER_STATUSES, type Order, type Review } from "@/types";

describe("auth service", () => {
  it("issues a JWT-shaped token that decodes and expires", () => {
    const user = { id: "u1", username: "u", email: "u@x.com", firstName: "U", lastName: "X", phone: "", avatar: null, role: "customer" as const, source: "local" as const };
    const token = createToken(user, 60_000, 1_000_000);
    expect(token.split(".")).toHaveLength(3);
    expect(decodeToken(token)).toMatchObject({ sub: "u1", role: "customer" });
    const s = createSession(user, 60_000);
    expect(isSessionValid(s)).toBe(true);
    expect(isSessionValid(s, Date.now() + 120_000)).toBe(false);
    expect(refreshSession(s, 60_000, Date.now() + 30_000).expiresAt).toBeGreaterThan(s.expiresAt);
    expect(decodeToken("garbage")).toBeNull();
  });

  it("signs in demo accounts and reports which field failed (edge case 19)", async () => {
    await expect(authenticate(DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.password, [])).resolves.toMatchObject({ role: "admin" });
    await expect(authenticate(DEMO_ACCOUNTS.customer.email, "wrong", [])).rejects.toMatchObject({ field: "password" });
    await expect(authenticate("nobody@x.com", "whatever", [])).rejects.toMatchObject({ field: "identifier" });
    await expect(authenticate("", "x", [])).rejects.toBeInstanceOf(AuthError);
  });

  it("registers a local user with a hashed password and blocks duplicates", async () => {
    const record = await registerUser({ firstName: "A", lastName: "B", email: "New@Test.com", phone: "9876543210", password: "Secret123" }, []);
    expect(record.email).toBe("new@test.com");
    expect(record.passwordHash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.passwordHash).not.toContain("Secret123");
    await expect(authenticate("new@test.com", "Secret123", [record])).resolves.toMatchObject({ id: record.id });
    await expect(registerUser({ firstName: "A", lastName: "B", email: "new@test.com", phone: "9876543210", password: "Secret123" }, [record])).rejects.toMatchObject({ field: "email" });
  });

  it("only allows safe relative post-login redirects", () => {
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/login")).toBe("/");
  });
});

describe("orders", () => {
  const fixtures = loadFixtureOrders(Date.parse("2026-01-10T10:00:00Z"));
  it("fixtures cover every tracking status", () => {
    expect(new Set(fixtures.map((o) => o.status))).toEqual(new Set(ORDER_STATUSES));
  });
  it("MOD-08-001: a shipped order shows 4 completed stages with timestamps and 2 upcoming", () => {
    const shipped = fixtures.find((o) => o.status === "shipped")!;
    const t = buildTimeline(shipped);
    expect(t.filter((s) => s.state === "complete").map((s) => s.status)).toEqual(["placed", "confirmed", "packed"]);
    expect(t[3]).toMatchObject({ status: "shipped", state: "current" });
    expect(t.slice(0, 4).every((s) => s.at)).toBe(true);
    expect(t.slice(4).map((s) => s.state)).toEqual(["upcoming", "upcoming"]);
  });
  it("advances one stage at a time and stops at delivered", () => {
    let o: Order = { ...fixtures[0], status: "out-for-delivery" };
    o = advanceOrder(o);
    expect(o.status).toBe("delivered");
    expect(advanceOrder(o)).toBe(o);
    expect(nextStatus("delivered")).toBeNull();
  });
  it("auto-progresses local orders on the simulated clock", () => {
    const placed = Date.parse("2026-01-01T00:00:00Z");
    const order = { ...fixtures[0], source: "local" as const, status: "placed" as const, createdAt: new Date(placed).toISOString(), timeline: [{ status: "placed" as const, at: new Date(placed).toISOString() }] };
    expect(autoProgress(order, placed + 6 * 60_000).status).toBe("packed");
    expect(autoProgress({ ...order, source: "fixture" }, placed + 999 * 60_000).status).toBe("placed");
  });
});

describe("reviews", () => {
  const base: Review = { id: "r", productId: 5, userId: "u1", authorName: "A", rating: 4, title: "t", body: "b", createdAt: "2026-01-02", helpful: 1, notHelpful: 0, verifiedPurchase: false, source: "local" };
  it("verified purchase is derived from local order history", () => {
    const order = { userId: "u1", lines: [{ productId: 5 }] } as unknown as Order;
    expect(isVerified(base, [order])).toBe(true);
    expect(isVerified({ ...base, userId: "u2" }, [order])).toBe(false);
    expect(isVerified({ ...base, source: "fixture", verifiedPurchase: true }, [])).toBe(true);
  });
  it("sorts and summarizes", () => {
    const list = [{ ...base, id: "a", rating: 2, helpful: 9 }, { ...base, id: "b", rating: 5, createdAt: "2026-02-01" }];
    expect(sortReviews(list, "highest")[0].id).toBe("b");
    expect(sortReviews(list, "helpful")[0].id).toBe("a");
    expect(sortReviews(list, "recent")[0].id).toBe("b");
    const s = summarizeRatings(list);
    expect(s.average).toBe(3.5);
    expect(s.distribution.find((d) => d.stars === 5)!.count).toBe(1);
  });
});

describe("delivery + mock payment", () => {
  it("estimates delivery by pincode", () => {
    expect(estimateDelivery("600028").isMetro).toBe(true);
    expect(estimateDelivery("641001").isMetro).toBe(false);
    expect(estimateDelivery("12345").serviceable).toBe(false);
    expect(estimateDelivery("990001").serviceable).toBe(false);
  });
  it("simulates success and failure scenarios without real data", async () => {
    await expect(simulatePayment({ method: "mock-card", scenario: "success" }, 0)).resolves.toMatchObject({ ok: true });
    await expect(simulatePayment({ method: "mock-card", scenario: "declined" }, 0)).resolves.toMatchObject({ ok: false });
    await expect(simulatePayment({ method: "mock-upi", handle: "failure@mockupi" }, 0)).resolves.toMatchObject({ ok: false });
    await expect(simulatePayment({ method: "mock-cod" }, 0)).resolves.toMatchObject({ ok: true });
  });
  it("builds an order in the 'placed' state", () => {
    const order = buildOrder({
      user: { id: "u1", username: "u", email: "u@x.com", firstName: "U", lastName: "X", phone: "", avatar: null, role: "customer", source: "local" },
      customer: { fullName: "U X", email: "u@x.com", phone: "9876543210" },
      address: { label: "Home", fullName: "U X", phone: "9876543210", line1: "1 Street", line2: "", city: "Chennai", state: "Tamil Nadu", pincode: "600028" },
      deliveryId: "express",
      payment: { method: "mock-upi", reference: "MOCK-1" },
      lines: [],
      totals: { itemCount: 0, subtotal: 0, mrpTotal: 0, productSavings: 0, couponDiscount: 0, shipping: 0, tax: 0, total: 0 },
      couponCode: null,
    });
    expect(order).toMatchObject({ status: "placed", source: "local", delivery: { id: "express" } });
    expect(order.id).toMatch(/^SS-\d{6}-[A-Z0-9]{5}$/);
  });
});

describe("review moderation (PRD §4.3 — admins moderate reviews)", () => {
  it("hides and shows a review, and deleting a review clears its hidden flag", async () => {
    const { useReviewsStore } = await import("@/store/reviews.store");
    useReviewsStore.setState({ local: [], hidden: [] });
    const r = useReviewsStore.getState().submit({ productId: 1, userId: "u1", authorName: "Asha K.", rating: 2, title: "Not for me", body: "The fit was too small for me." });

    useReviewsStore.getState().setHidden(r.id, true);
    useReviewsStore.getState().setHidden(r.id, true); // idempotent
    expect(useReviewsStore.getState().hidden).toEqual([r.id]);

    useReviewsStore.getState().setHidden(r.id, false);
    expect(useReviewsStore.getState().hidden).toEqual([]);

    useReviewsStore.getState().setHidden(r.id, true);
    useReviewsStore.getState().remove(r.id);
    expect(useReviewsStore.getState().local).toHaveLength(0);
    expect(useReviewsStore.getState().hidden).toEqual([]);
  });
});
