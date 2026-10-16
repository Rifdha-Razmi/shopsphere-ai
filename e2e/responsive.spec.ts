import { expect, test } from "@playwright/test";

test("mobile: bottom bar, filter drawer and assistant are reachable", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("navigation", { name: "Quick access" })).toBeVisible();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("navigation", { name: "Quick access" }).getByRole("button", { name: "Ask AI" }).click();
  await expect(page.getByRole("dialog", { name: "Shopping Assistant" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
