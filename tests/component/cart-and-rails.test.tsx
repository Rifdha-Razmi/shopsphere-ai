import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartLine } from "@/features/cart/components/cart-line";
import { RecommendationRail } from "@/features/recommendations/components/recommendation-rail";
import { useCartStore } from "@/store/cart.store";
import { useSignalsStore } from "@/store/signals.store";
import { useWishlistStore } from "@/store/wishlist.store";
import type { CartItem } from "@/types";
import { renderWithProviders } from "../helpers/render";
import { makeProduct } from "../helpers/factories";
import { snapshotCatalog } from "../helpers/catalog";

const product = makeProduct({ id: 1, title: "Clamp Phone", stock: 3, price: 1000 });
const item: CartItem = { key: "1:default", productId: 1, variantId: null, variantLabel: null, quantity: 2, unitPrice: 1000, addedAt: 1, snapshot: { title: "Clamp Phone", thumbnail: "", brand: "Acme", category: "smartphones", stock: 3, mrp: 1200 } };

describe("CartLine", () => {
  it("MOD-05-001: clamps quantity to stock with an inline message", async () => {
    useCartStore.setState({ items: [item] });
    renderWithProviders(<CartLine line={{ item, product, issue: null, available: 3, price: 1000, selected: true }} />);
    const qty = screen.getByRole("spinbutton", { name: /quantity for clamp phone/i });
    await userEvent.clear(qty);
    await userEvent.type(qty, "5");
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(screen.getByRole("status")).toHaveTextContent(/only 3 in stock/i);
  });

  it("shows price-change confirmation (edge case 10)", async () => {
    useCartStore.setState({ items: [item] });
    renderWithProviders(<CartLine line={{ item, product: { ...product, price: 1200 }, issue: { type: "price-changed", oldPrice: 1000, newPrice: 1200 }, available: 3, price: 1000, selected: true }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/price increased/i);
    await userEvent.click(screen.getByRole("button", { name: /accept new price/i }));
    expect(useCartStore.getState().items[0].unitPrice).toBe(1200);
  });

  it("flags an unavailable product with a Remove action", async () => {
    useCartStore.setState({ items: [item] });
    renderWithProviders(<CartLine line={{ item, product: undefined, issue: { type: "unavailable" }, available: 0, price: 1000, selected: true }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/no longer available/i);
    await userEvent.click(screen.getAllByRole("button", { name: /^remove$/i })[0]);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe("RecommendationRail", () => {
  it("renders a signal-transparent heading for recently viewed", async () => {
    useSignalsStore.setState({ recentlyViewed: [{ productId: 124, at: 2 }, { productId: 100, at: 1 }] });
    renderWithProviders(<RecommendationRail request={{ strategy: "recently-viewed" }} />, { catalog: snapshotCatalog });
    expect(await screen.findByRole("heading", { name: /recently viewed/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "iPhone X" })).toBeInTheDocument();
  });

  it("hides an empty rail (edge case 16)", async () => {
    useWishlistStore.setState({ items: [] });
    const { container } = renderWithProviders(<RecommendationRail request={{ strategy: "wishlist" }} options={{ fallback: "none" }} />, { catalog: snapshotCatalog });
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector("[data-testid]")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("falls back to 'Popular Right Now' for new visitors", async () => {
    useSignalsStore.setState({ recentlyViewed: [], searchHistory: [] });
    useCartStore.setState({ items: [] });
    useWishlistStore.setState({ items: [] });
    renderWithProviders(<RecommendationRail request={{ strategy: "personalized" }} options={{ fallback: "trending" }} />, { catalog: snapshotCatalog });
    expect(await screen.findByRole("heading", { name: /popular right now/i })).toBeInTheDocument();
  });
});
