import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a production build served with the offline DummyJSON mock
 * (NEXT_PUBLIC_PRODUCT_API_URL=/api/mock) so tests are deterministic and need
 * no network access. Set E2E_BASE_URL to test a deployed URL instead.
 */
const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: { baseURL, trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: [/responsive\.spec\.ts/, /screenshots\//] },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORT}`,
        url: baseURL,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
        env: { NEXT_PUBLIC_PRODUCT_API_URL: "/api/mock", NEXT_TELEMETRY_DISABLED: "1" },
      },
});
