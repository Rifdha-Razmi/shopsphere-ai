import { expect, test } from "@playwright/test";

test("search with suggestions, URL state, filters and sorting", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search products" });
  await search.fill("iphone");
  await expect(page.getByRole("option", { name: /iPhone/ }).first()).toBeVisible();
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=iphone/);
  await expect(page.getByRole("heading", { name: /Results for “iphone”/ })).toBeVisible();

  await expect(page.locator('ul[aria-label="Products"] article').first()).toBeVisible();
  await page.getByLabel("Sort by").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  const prices = await page.locator('ul[aria-label="Products"] article').evaluateAll((cards) =>
    cards.map((c) => Number(c.querySelector("[data-price]")?.getAttribute("data-price"))),
  );
  expect(prices).toEqual([...prices].sort((a, b) => a - b));

  await page.goBack();
  await expect(page).not.toHaveURL(/sort=price-asc/);
});

test("MOD-02-001: combined price + rating filter on a category, with chips", async ({ page }) => {
  await page.goto("/category/mens-shoes?min=2000&max=12000&rating=4&sort=price-asc");
  await expect(page.getByRole("button", { name: /Remove filter ₹2,000 – ₹12,000/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove filter 4★ & up" })).toBeVisible();
  await expect(page.locator('ul[aria-label="Products"] > li')).toHaveCount(4); // Puma, 2× Off White, Nike Air Jordan
  await expect(page.locator('ul[aria-label="Products"] article').first()).toContainText("Puma");
});

test("MOD-02-002: no-results state names the filters and clears them", async ({ page }) => {
  await page.goto("/products?min=1&max=2&rating=4");
  await expect(page.getByRole("heading", { name: "No products match these filters" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator('ul[aria-label="Products"] > li').first()).toBeVisible();
});

test("search with no results suggests spellings", async ({ page }) => {
  await page.goto("/search?q=lapotp");
  await expect(page.getByRole("heading", { name: /No results for “lapotp”/ })).toBeVisible();
  await expect(page.getByText("Did you mean")).toBeVisible();
});
