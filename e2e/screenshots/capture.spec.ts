import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN, CUSTOMER, login } from "../helpers";

/**
 * Deliverable screenshots (PRD §22 #7): every page of the storefront, the
 * customer account and the admin dashboard at mobile, tablet and desktop
 * widths, written to docs/screenshots/<breakpoint>/.
 */
async function shot(page: Page, name: string, project: string, fullPage = false) {
  // Full-page shots: scroll through once so lazy-loaded product photos below the fold load too.
  if (fullPage) {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `docs/screenshots/${project}/${name}.png`, fullPage });
}

/** Lets images and rails finish loading before a capture. */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

const h1 = (page: Page) => page.getByRole("heading", { level: 1 }).first();

test.describe.configure({ mode: "serial" });

// Start each breakpoint from an empty folder so renamed screens don't leave old files behind.
test.beforeAll(({}, info) => {
  fs.rmSync(`docs/screenshots/${info.project.name}`, { recursive: true, force: true });
});

test("storefront screens", async ({ page }, info) => {
  const p = info.project.name;
  const mobile = p === "mobile";

  // A little browsing history so the personalised rails appear.
  await page.goto("/product/90");
  await expect(h1(page)).toBeVisible();
  await page.goto("/product/124");
  await expect(page.getByTestId("rail-similar")).toBeVisible();
  await settle(page);
  await shot(page, "08-product-detail", p);

  await page.getByRole("heading", { name: "Ratings & reviews" }).scrollIntoViewIfNeeded();
  await settle(page);
  await shot(page, "09-product-reviews", p);

  await page.goto("/");
  await expect(page.getByTestId("rail-recently-viewed")).toBeVisible();
  await settle(page);
  await shot(page, "01-home", p, true);

  // Categories: mega-menu on tablet/desktop, hamburger menu on phones.
  if (mobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  } else {
    await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /Categories/ }).click();
    await expect(page.getByRole("menu")).toBeVisible();
  }
  await settle(page);
  await shot(page, "02-categories-menu", p);
  await page.keyboard.press("Escape");

  // Live search suggestions.
  if (mobile) await page.getByRole("button", { name: "Search", exact: true }).click();
  const search = page.getByRole("combobox", { name: "Search products" }).last();
  await search.fill("phone");
  await expect(page.getByRole("listbox", { name: "Search suggestions" })).toBeVisible();
  await expect(page.getByLabel("Loading suggestions")).toHaveCount(0);
  await expect(page.getByRole("option").nth(2)).toBeVisible();
  await settle(page);
  await shot(page, "03-search-suggestions", p);

  await page.goto("/search?q=watch");
  await expect(page.locator('ul[aria-label="Products"] article').first()).toBeVisible();
  await settle(page);
  await shot(page, "04-search-results", p);

  await page.goto("/category/smartphones?rating=4&sort=price-asc");
  await expect(page.locator('ul[aria-label="Products"] article').first()).toBeVisible();
  if (mobile) {
    await page.getByRole("button", { name: /^Filters/ }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  }
  await settle(page);
  await shot(page, "05-category-filters", p);
  if (mobile) await page.keyboard.press("Escape");

  // Assistant with a structured intent (PRD §7.3 example).
  await page.goto("/");
  // Phones and tablets open it from the bottom bar; laptops and up from the floating button.
  if (p === "desktop") await page.getByRole("button", { name: "Open AI shopping assistant" }).click();
  else await page.getByRole("navigation", { name: "Quick access" }).getByRole("button", { name: "Ask AI" }).click();
  const input = page.getByLabel("Message the shopping assistant");
  await input.fill("Show me smartphones under 30,000 rupees with good ratings");
  await input.press("Enter");
  await expect(page.getByText("Max price: ₹30,000")).toBeVisible();
  await settle(page);
  await shot(page, "10-assistant", p);

  await page.goto("/help/assistant");
  await expect(h1(page)).toBeVisible();
  await settle(page);
  await shot(page, "11-assistant-help", p);

  await page.goto("/login");
  await settle(page);
  await shot(page, "12-sign-in", p);

  await page.goto("/register");
  await settle(page);
  await shot(page, "13-register", p);

  // Last, so the compare tray doesn't appear in the other screens.
  await page.goto("/category/laptops");
  const cards = page.locator('ul[aria-label="Products"] article');
  await cards.first().hover();
  await cards.first().getByRole("button", { name: /^Quick view/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await settle(page);
  await shot(page, "06-quick-view", p);
  await page.keyboard.press("Escape");

  await cards.nth(0).getByRole("checkbox", { name: /^Compare/ }).check();
  await cards.nth(1).getByRole("checkbox", { name: /^Compare/ }).check();
  await cards.nth(2).getByRole("checkbox", { name: /^Compare/ }).check();
  await page.getByRole("link", { name: /Compare \(3\/4\)/ }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await settle(page);
  await shot(page, "07-compare", p);
});

test("customer shopping screens", async ({ page }, info) => {
  const p = info.project.name;
  await login(page, CUSTOMER, "/product/6");

  // Cart with two items, one unticked (only ticked items are checked out).
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/product/1");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  const items = page.getByRole("region", { name: "Cart items" });
  await expect(items).toBeVisible();
  await items.getByRole("checkbox", { name: /^Select .* for checkout$/ }).last().click();
  await settle(page);
  await shot(page, "14-cart", p, true);

  // Checkout: address → delivery → review → test-mode payment → confirmation.
  await page.getByRole("button", { name: /Proceed to checkout/ }).click();
  await page.getByRole("button", { name: "Continue to address" }).click();
  await page.getByLabel("Flat, house no., street").fill("12, Lake View Road");
  await page.getByLabel("City").fill("Chennai");
  await page.getByLabel("State").selectOption("Tamil Nadu");
  await page.getByLabel("Pincode").fill("600028");
  await settle(page);
  await shot(page, "15-checkout-address", p);

  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await page.getByRole("radio", { name: /Express Delivery/ }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("list", { name: "Items" })).toBeVisible();
  await settle(page);
  await shot(page, "16-checkout-review", p);

  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("radio", { name: /Mock Card/ }).click();
  await expect(page.getByLabel("Test scenario", { exact: true })).toBeVisible();
  await settle(page);
  await shot(page, "17-checkout-payment", p);

  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await expect(page.getByRole("heading", { name: /Your order is placed/ })).toBeVisible();
  await settle(page);
  await shot(page, "18-order-confirmation", p);

  await page.goto("/account/orders");
  await expect(page.getByRole("heading", { name: "Orders", level: 1 })).toBeVisible();
  await settle(page);
  await shot(page, "19-orders", p);

  // A delivered order: tracking timeline + "Write a review" on each item.
  await page.goto("/account/orders/SS-FX-00001");
  await expect(page.getByRole("list", { name: "Order progress" })).toBeVisible();
  await settle(page);
  await shot(page, "20-order-tracking", p, true);

  await page.getByRole("button", { name: /^Write a review for/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "5 stars" }).click();
  await dialog.getByLabel(/Headline/).fill("Excellent purchase");
  await dialog.getByLabel(/Your review/).fill("Arrived quickly and works exactly as described. Very happy.");
  await settle(page);
  await shot(page, "21-write-review", p);
  await dialog.getByRole("button", { name: "Submit review" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/account/reviews");
  await expect(page.getByRole("heading", { name: "My reviews", level: 1 })).toBeVisible();
  await settle(page);
  await shot(page, "22-my-reviews", p);
});

test("customer account screens", async ({ page }, info) => {
  const p = info.project.name;
  await login(page, CUSTOMER, "/product/6");
  await page.goto("/product/1");
  await expect(h1(page)).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Addresses", exact: true })).toBeVisible();
  await settle(page);
  await shot(page, "23-account-profile", p);

  await page.goto("/account/preferences");
  await expect(page.getByRole("heading", { name: "Recommendation preferences", level: 1 })).toBeVisible();
  await settle(page);
  await shot(page, "24-recommendation-preferences", p);

  await page.goto("/account/recently-viewed");
  await expect(page.getByRole("heading", { name: "Recently viewed", level: 1 })).toBeVisible();
  await settle(page);
  await shot(page, "25-recently-viewed", p);

  await page.goto("/category/fragrances");
  await page.locator('ul[aria-label="Products"] article').first().getByRole("button", { name: /to wishlist/ }).click();
  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { name: "Wishlist", level: 1 })).toBeVisible();
  await settle(page);
  await shot(page, "26-wishlist", p);
});

test("admin screens", async ({ page }, info) => {
  const p = info.project.name;
  await login(page, ADMIN, "/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await settle(page);
  await shot(page, "27-admin-overview", p, true);

  const pages: [string, string, RegExp | null][] = [
    ["/admin/products", "28-admin-products", /Products/],
    ["/admin/products/1", "29-admin-product-edit", /Edit #1/],
    ["/admin/categories", "30-admin-categories", /Categories/],
    ["/admin/inventory", "31-admin-inventory", /Inventory/],
    ["/admin/orders", "32-admin-orders", /Orders/],
    ["/admin/orders/SS-FX-00006", "33-admin-order-detail", null],
    ["/admin/customers", "34-admin-customers", /Customers/],
    ["/admin/reviews", "35-admin-reviews", /Reviews/],
    ["/admin/analytics", "36-admin-analytics", /Recommendation analytics/],
    ["/admin/profile", "37-admin-profile", null],
  ];
  for (const [url, name, heading] of pages) {
    await page.goto(url);
    await expect(heading ? page.getByRole("heading", { name: heading, level: 1 }) : h1(page)).toBeVisible();
    if (url === "/admin/products/1") await expect(page.getByLabel("Category")).not.toHaveValue("");
    await settle(page);
    await shot(page, name, p);
  }
});
