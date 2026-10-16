import { expect, test } from "@playwright/test";
import { addSimpleProductToCart, login } from "./helpers";

test("PDP: variants, add to cart, duplicate add increments, quantity clamped", async ({ page }) => {
  await login(page);
  await page.goto("/product/90"); // Puma Future Rider — size variants, plenty of stock
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Puma Future Rider");
  const soldOut = page.getByRole("radio", { name: /out of stock/ });
  if (await soldOut.count()) await expect(soldOut.first()).toHaveAttribute("aria-disabled", "true");

  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  await expect(page.getByRole("listitem", { name: /Puma Future Rider/ })).toHaveCount(1);
  const qty = page.getByRole("spinbutton", { name: /Quantity for Puma Future Rider/ });
  await expect(qty).toHaveValue("2");
  await qty.fill("999");
  await expect(page.getByText(/in stock — quantity set to/)).toBeVisible();
  expect(Number(await qty.inputValue())).toBeLessThan(999);
});

test("MOD-04-001: a sold-out variant is disabled; other variants stay selectable", async ({ page }) => {
  await page.goto("/product/92"); // Sports Sneakers Off White Red — UK 9 has zero stock
  const uk9 = page.getByRole("radio", { name: /UK 9 — out of stock/ });
  await expect(uk9).toHaveAttribute("aria-disabled", "true");
  await uk9.click({ force: true });
  await expect(uk9).toHaveAttribute("aria-checked", "false");
  await page.getByRole("radio", { name: /^UK 10/ }).click();
  await expect(page.getByRole("radio", { name: /^UK 10/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
});

test("removed product shows a 'no longer available' state", async ({ page }) => {
  await page.goto("/product/999999");
  await expect(page.getByRole("heading", { name: "This product is no longer available" })).toBeVisible();
});

test("coupon codes: invalid, expired and valid", async ({ page }) => {
  await login(page);
  await addSimpleProductToCart(page, 6);
  await page.goto("/cart");
  const input = page.getByLabel("Coupon code");
  await input.fill("NOPE");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/isn't a valid coupon/)).toBeVisible();
  await input.fill("DIWALI2024");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/expired/)).toBeVisible();
  await input.fill("WELCOME10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/WELCOME10 applied —/)).toBeVisible();
});

test("wishlist: add, view, move to cart", async ({ page }) => {
  await login(page);
  await page.goto("/category/fragrances");
  const first = page.locator('ul[aria-label="Products"] article').first();
  const title = (await first.getByRole("heading").textContent())!.trim();
  await first.getByRole("button", { name: /to wishlist/ }).click();
  await page.goto("/wishlist");
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();
  const move = page.getByRole("button", { name: `Move ${title} to cart` });
  if (await move.count()) {
    await move.click();
    await expect(page.getByRole("heading", { name: "Your wishlist is empty" })).toBeVisible();
  }
});

test("compare two products side by side", async ({ page }) => {
  await page.goto("/category/laptops");
  const cards = page.locator('ul[aria-label="Products"] article');
  await cards.nth(0).getByRole("checkbox", { name: /^Compare/ }).check();
  await cards.nth(1).getByRole("checkbox", { name: /^Compare/ }).check();
  await page.getByRole("link", { name: /Compare \(2\/4\)/ }).click();
  await expect(page.getByRole("table")).toContainText("Price");
});
