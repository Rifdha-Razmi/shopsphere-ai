import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPanel } from "@/features/products/components/filter-panel";
import { computeFacets } from "@/services/catalog/filter";
import { EMPTY_FILTERS } from "@/types";
import { renderWithProviders } from "../helpers/render";
import { makeProduct } from "../helpers/factories";

const products = [makeProduct({ brand: "Nike", price: 1000 }), makeProduct({ brand: "Puma", price: 5000 })];

describe("FilterPanel", () => {
  it("emits brand, rating, availability and on-sale changes", async () => {
    const onChange = vi.fn();
    renderWithProviders(<FilterPanel filters={EMPTY_FILTERS} facets={computeFacets(products)} onChange={onChange} categoryName={(s) => s} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /nike/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ brands: ["Nike"] }));
    await userEvent.click(screen.getByRole("radio", { name: /4.*& up/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ minRating: 4 }));
    await userEvent.click(screen.getByRole("radio", { name: /^in stock$/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ availability: "in-stock" }));
    await userEvent.click(screen.getByRole("switch", { name: /on sale only/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ onSale: true }));
  });

  it("auto-swaps an inverted typed price range (edge case 7)", async () => {
    const onChange = vi.fn();
    renderWithProviders(<FilterPanel filters={EMPTY_FILTERS} facets={computeFacets(products)} onChange={onChange} categoryName={(s) => s} />);
    await userEvent.type(screen.getByLabelText(/min ₹/i), "5000");
    await userEvent.type(screen.getByLabelText(/max ₹/i), "2000{enter}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ minPrice: 2000, maxPrice: 5000 }));
  });
});
