import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { SearchBar } from "@/features/search/components/search-bar";
import { useSignalsStore } from "@/store/signals.store";
import { renderWithProviders } from "../helpers/render";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ products: [{ id: 1, title: "iPhone 9", price: 549 }], total: 1, skip: 0, limit: 6 }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  useSignalsStore.setState({ searchHistory: ["laptop"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SearchBar", () => {
  it("MOD-03-001: debounces — no request while typing, one after the pause", async () => {
    renderWithProviders(<SearchBar />, { catalog: [] });
    const input = screen.getByRole("combobox", { name: /search products/i });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ip" } });
    await act(() => vi.advanceTimersByTimeAsync(100));
    fireEvent.change(input, { target: { value: "iph" } });
    await act(() => vi.advanceTimersByTimeAsync(100));
    fireEvent.change(input, { target: { value: "iphone" } });
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=iphone");
    expect(await screen.findByRole("option", { name: /iphone 9/i })).toBeInTheDocument();
  });

  it("shows recent and popular searches when focused and empty (edge case 5)", async () => {
    renderWithProviders(<SearchBar />, { catalog: [] });
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: /laptop/i })).toBeInTheDocument();
    expect(screen.getByText(/recent searches/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear history/i }));
    expect(useSignalsStore.getState().searchHistory).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
