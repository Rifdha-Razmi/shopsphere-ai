import { expect, type Page } from "@playwright/test";

export const CUSTOMER = { email: "customer@shopsphere.dev", password: "Customer@123" };
export const ADMIN = { email: "admin@shopsphere.dev", password: "Admin@123" };

export async function login(page: Page, who = CUSTOMER, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email or username").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
}

/** Opens a no-variant, in-stock product and adds it to the cart. Returns its title. */
export async function addSimpleProductToCart(page: Page, id = 1) {
  await page.goto(`/product/${id}`);
  const title = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("link", { name: /^Cart/ }).first()).toBeVisible();
  return title;
}
