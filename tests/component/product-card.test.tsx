import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "@/features/products/components/product-card";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useUiStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { createSession } from "@/services/auth/auth.service";

const signIn = () =>
  useAuthStore.setState({ session: createSession({ id: "u1", username: "u", email: "u@x.com", firstName: "U", lastName: "X", phone: "", avatar: null, role: "customer", source: "local" }, 60_000) });
const signOut = () => useAuthStore.setState({ session: null });
import { renderWithProviders } from "../helpers/render";
import { makeProduct } from "../helpers/factories";

describe("ProductCard", () => {
  it("shows price, discount and rating, and adds to cart", async () => {
    useCartStore.setState({ items: [] });
    signIn();
    const p = makeProduct({ title: "Galaxy Test", price: 1999, mrp: 2499, discountPercentage: 20 });
    renderWithProviders(<ProductCard product={p} />);
    expect(screen.getByRole("heading", { name: "Galaxy Test" })).toBeInTheDocument();
    expect(screen.getByText("₹1,999")).toBeInTheDocument();
    expect(screen.getByText("20% off", { selector: "span.font-semibold" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /add galaxy test to cart/i }));
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it("guests can add to cart and wishlist without signing in (PRD §4.3)", async () => {
    useCartStore.setState({ items: [] });
    useWishlistStore.setState({ items: [] });
    signOut();
    const p = makeProduct({ title: "Guest Item" });
    renderWithProviders(<ProductCard product={p} />);
    await userEvent.click(screen.getByRole("button", { name: /add guest item to cart/i }));
    await userEvent.click(screen.getByRole("button", { name: /add guest item to wishlist/i }));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useWishlistStore.getState().items).toHaveLength(1);
  });

  it("disables add-to-cart when out of stock", () => {
    renderWithProviders(<ProductCard product={makeProduct({ title: "Sold Out", stock: 0 })} />);
    expect(screen.getByRole("button", { name: /add sold out to cart/i })).toBeDisabled();
    expect(screen.getAllByText(/out of stock/i).length).toBeGreaterThan(0);
  });

  it("routes variant products to options instead of adding directly", () => {
    renderWithProviders(<ProductCard product={makeProduct({ title: "Shoe", variants: [{ id: "uk-8", attributes: { size: "UK 8" }, stock: 3 }] })} />);
    expect(screen.getByRole("link", { name: /choose options for shoe/i })).toBeInTheDocument();
  });

  it("toggles wishlist and compare", async () => {
    useWishlistStore.setState({ items: [] });
    useUiStore.setState({ compareIds: [] });
    signIn();
    const p = makeProduct({ title: "Watch" });
    renderWithProviders(<ProductCard product={p} />);
    await userEvent.click(screen.getByRole("button", { name: /add watch to wishlist/i }));
    expect(useWishlistStore.getState().items.map((i) => i.productId)).toEqual([p.id]);
    await userEvent.click(screen.getByRole("checkbox", { name: /compare watch/i }));
    expect(useUiStore.getState().compareIds).toEqual([p.id]);
  });
});
