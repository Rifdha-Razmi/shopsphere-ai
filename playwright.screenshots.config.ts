import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * Captures the deliverable screenshots (PRD §22 #7) at mobile, tablet and
 * desktop widths into docs/screenshots/.
 *
 * By default it builds against the live DummyJSON API so real product photos
 * appear (needs internet). `npm run screenshots:mock` uses the offline mock
 * API instead (placeholder product art) — handy for checking the script.
 */
const PORT = 3200;
const useMock = process.env.SCREENSHOT_API === "mock";
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  ...base,
  testDir: "./e2e/screenshots",
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // Uses the Google Chrome already installed on this computer (no browser download).
  // Set SCREENSHOT_BROWSER=chromium to use Playwright's own Chromium instead.
  use: { ...base.use, baseURL, channel: process.env.SCREENSHOT_BROWSER ?? "chrome" },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: "tablet", use: { viewport: { width: 820, height: 1180 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: "1", ...(useMock ? { NEXT_PUBLIC_PRODUCT_API_URL: "/api/mock" } : {}) },
  },
});
