import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// next/navigation is not available outside the Next runtime.
vi.mock("next/navigation", () => {
  const push = vi.fn();
  const replace = vi.fn();
  return {
    useRouter: () => ({ push, replace, back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
  };
});

class IO {
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}
// @ts-expect-error jsdom lacks IntersectionObserver
globalThis.IntersectionObserver = IO;
if (!window.matchMedia) {
  // @ts-expect-error minimal stub
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
}
Element.prototype.scrollIntoView = vi.fn();

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// jsdom lacks ResizeObserver (used by Radix Slider)
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver;
