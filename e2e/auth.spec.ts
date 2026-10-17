import { expect, test } from "@playwright/test";
import { CUSTOMER, login } from "./helpers";

test("protected routes redirect to login and back", async ({ page }) => {
  await page.goto("/account/orders");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Forders/);
  await page.getByLabel("Email or username").fill(CUSTOMER.email);
  await page.getByLabel("Password", { exact: true }).fill(CUSTOMER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);
  await expect(page.getByRole("heading", { name: "Orders", level: 1 })).toBeVisible();
});

test("invalid credentials show a clear inline error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(CUSTOMER.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("That password is incorrect.")).toBeVisible();
});

test("register a new account, session survives refresh, then log out", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("First name").fill("Priya");
  await page.getByLabel("Last name").fill("Kumar");
  await page.getByLabel("Email", { exact: true }).fill(`priya.${Date.now()}@example.com`);
  await page.getByLabel("Mobile number").fill("9876501234");
  await page.getByLabel("Password", { exact: true }).fill("Secret123");
  await page.getByLabel("Confirm password").fill("Secret123");
  await page.getByLabel(/I agree/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/");
  await page.reload();
  await page.getByRole("button", { name: /Account menu for Priya/ }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
});

test("guest: Sign in goes straight to the sign-in page, which links to registration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/register/);
});

test("guest: cart and wishlist work without signing in; checkout asks to sign in and keeps the cart (PRD §4.3)", async ({ page }) => {
  await page.goto("/product/6");
  const title = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page).toHaveURL(/\/product\/6$/);

  await page.goto("/category/fragrances");
  await page.locator('ul[aria-label="Products"] article').first().getByRole("button", { name: /to wishlist/ }).click();
  await expect(page).toHaveURL(/\/category\/fragrances$/);

  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { name: "Wishlist", level: 1 })).toBeVisible();
  await expect(page.getByText("1 saved item")).toBeVisible();
  await expect(page.getByText(/to keep your wishlist after you close this tab/)).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: /Your cart/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Cart items" }).getByText(title)).toBeVisible();

  // Checkout requires sign-in; the guest cart is merged into the account.
  await page.getByRole("link", { name: /Proceed to checkout/ }).or(page.getByRole("button", { name: /Proceed to checkout/ })).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout/);
  await page.getByLabel("Email or username").fill(CUSTOMER.email);
  await page.getByLabel("Password", { exact: true }).fill(CUSTOMER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page.goto("/cart");
  await expect(page.getByRole("region", { name: "Cart items" }).getByText(title)).toBeVisible();
});

test("customers cannot open the admin dashboard", async ({ page }) => {
  await login(page);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/forbidden/);
});

test("my account: orders page has no account sidebar; addresses live on the profile page", async ({ page }) => {
  await login(page);
  await page.goto("/account/orders");
  await expect(page.getByRole("heading", { name: "Orders", level: 1 })).toBeVisible();
  await expect(page.locator("aside").getByRole("navigation", { name: "Account", exact: true })).toHaveCount(0);

  await page.goto("/account");
  const nav = page.locator("aside").getByRole("navigation", { name: "Account", exact: true });
  await expect(nav.getByRole("link")).toHaveText(["Profile", "My reviews", "Recommendation preferences"]);
  await expect(page.getByRole("heading", { name: "Addresses", level: 2, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add address", exact: true })).toBeVisible();

  await page.goto("/account/addresses");
  await expect(page).toHaveURL(/\/account#addresses$/);
  await page.goto("/account/wishlist");
  await expect(page).toHaveURL(/\/wishlist$/);
});
