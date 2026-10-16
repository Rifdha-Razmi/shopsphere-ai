import { expect, test } from "@playwright/test";
import { expect as _e, type Page } from "@playwright/test";
import { ADMIN, CUSTOMER, addSimpleProductToCart, login, logout } from "./helpers";

async function adminLogout(page: Page) {
  await page.getByRole("button", { name: /Account menu for/ }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await _e(page).toHaveURL(/\/login/);
}

test("one login: admins land on /admin, customers on the store", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  // Admins can't use customer-only pages or shop
  await page.goto("/cart");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/account/orders");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/product/6");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText(/Admin accounts manage the store/)).toBeVisible();
});

test("admin edits stock → the customer's cart flags the item and blocks checkout", async ({ page }) => {
  await login(page, CUSTOMER);
  await addSimpleProductToCart(page, 6);
  await logout(page);

  await login(page, ADMIN, "/admin/products/6");
  await expect(page.getByRole("heading", { name: "Edit #6" })).toBeVisible();
  await page.getByLabel("Stock").fill("0");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  await adminLogout(page);

  await login(page, CUSTOMER, "/cart");
  await expect(page.getByRole("alert").first()).toContainText(/out of stock/i);
  await expect(page.getByRole("button", { name: /Proceed to checkout/ })).toBeDisabled();
});

test("admin dashboard: overview, order status advance, analytics label, delete guard", async ({ page }) => {
  await login(page, ADMIN, "/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Simulated").first()).toBeVisible();

  await page.goto("/admin/orders/SS-FX-00006");
  await page.getByRole("button", { name: /Advance to “Confirmed”/ }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("Confirmed");

  await page.goto("/admin/analytics");
  await expect(page.getByRole("heading", { name: "Recommendation analytics", level: 1 })).toBeVisible();

  await page.goto("/admin/products");
  await page.getByLabel("Search products").fill("iPhone X");
  await page.getByRole("button", { name: "Delete iPhone X" }).click();
  await expect(page.getByRole("heading", { name: "Archive instead of delete?" })).toBeVisible();
});

test("admin shell: menu toggle, profile dropdown with initials, profile page and logout", async ({ page }) => {
  await login(page, ADMIN, "/admin");
  const sidebar = page.getByRole("complementary", { name: "Admin sidebar" });
  await expect(sidebar.getByText("Recommendation analytics")).toBeVisible();
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(sidebar.getByText("Recommendation analytics")).toBeHidden(); // collapsed to icons
  await page.getByRole("button", { name: "Expand menu" }).click();
  await expect(sidebar.getByText("Recommendation analytics")).toBeVisible();

  const menu = page.getByRole("button", { name: "Account menu for Arjun Menon" });
  await expect(menu).toContainText("AM");
  await menu.click();
  await expect(page.getByText("Logged in as")).toBeVisible();
  await page.getByRole("menuitem", { name: "My profile" }).click();
  await expect(page).toHaveURL(/\/admin\/profile$/);
  await expect(page.getByRole("heading", { name: "Arjun Menon" })).toBeVisible();
  await page.getByLabel("First name").fill("Arun");
  await page.getByLabel("Last name").fill("Kumar");
  await page.getByRole("button", { name: "Save profile changes" }).click();
  await expect(page.getByRole("button", { name: "Account menu for Arun Kumar" })).toContainText("AK");

  // sidebar logout (the dropdown has one too)
  await sidebar.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("admin hides a review → it disappears from the product page; showing it brings it back", async ({ page }) => {
  await login(page, ADMIN, "/admin/reviews");
  await expect(page.getByRole("heading", { name: /Reviews/, level: 1 })).toBeVisible();
  await page.getByLabel("Search reviews").fill("Essence Mascara");
  const row = page.locator("tbody tr").first();
  const body = (await row.locator("td").nth(1).locator("p").nth(1).textContent())!.trim();
  await row.getByRole("button", { name: /Hide review/ }).click();
  await expect(row.getByText("Hidden", { exact: true })).toBeVisible();

  await page.goto("/product/1#reviews");
  await expect(page.getByRole("heading", { name: "Ratings & reviews" })).toBeVisible();
  await expect(page.getByText(body, { exact: true })).toHaveCount(0);

  await page.goto("/admin/reviews");
  await page.getByLabel("Filter by status").selectOption("hidden");
  await page.locator("tbody tr").first().getByRole("button", { name: /Show review/ }).click();
  await page.goto("/product/1#reviews");
  await expect(page.getByText(body, { exact: true }).first()).toBeVisible();
});

test("product edit form keeps the product's category when the category list loads late", async ({ page }) => {
  await login(page, ADMIN, "/admin");
  await page.route("**/products/categories*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.continue();
  });
  await page.goto("/admin/products/1");
  await expect(page.getByRole("heading", { name: /Edit #1/ })).toBeVisible();
  await expect(page.getByLabel("Category")).toHaveValue("beauty", { timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
});
