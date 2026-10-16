import { expect, test } from "@playwright/test";
import { addSimpleProductToCart, login } from "./helpers";

test("full checkout: failed payment retries on the payment step, then order tracking", async ({ page }) => {
  await login(page);
  const title = await addSimpleProductToCart(page, 6);
  await page.goto("/checkout");

  await page.getByRole("button", { name: "Continue to address" }).click();
  await page.getByLabel("Flat, house no., street").fill("12, Lake View Road");
  // MOD-06-002: refresh mid-address keeps the step and the typed data.
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByLabel("Flat, house no., street")).toHaveValue("12, Lake View Road");
  await page.getByLabel("City").fill("Chennai");
  await page.getByLabel("State").selectOption("Tamil Nadu");
  await page.getByLabel("Pincode").fill("600028");
  await page.getByRole("button", { name: "Continue to delivery" }).click();

  await page.getByRole("radio", { name: /Express Delivery/ }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByText(title).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue to payment" }).click();

  await expect(page.getByText("TEST MODE.")).toBeVisible();
  await page.getByRole("radio", { name: /Mock Card/ }).click();
  await page.getByLabel("Test scenario", { exact: true }).selectOption("declined");
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await expect(page.getByText("Payment failed")).toBeVisible();
  await expect(page.getByLabel("Test scenario", { exact: true })).toBeVisible(); // still on the payment step

  await page.getByLabel("Test scenario", { exact: true }).selectOption("success");
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await expect(page.getByRole("heading", { name: /Your order is placed/ })).toBeVisible();
  await page.getByRole("link", { name: "Track this order" }).click();
  await expect(page.getByRole("list", { name: "Order progress" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Order progress" }).getByText("Order Placed")).toBeVisible();
});

test("MOD-06-001: session expiry mid-checkout restores the same step after login", async ({ page }) => {
  await login(page);
  await addSimpleProductToCart(page, 6);
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Continue to address" }).click();
  await expect(page.getByLabel("Flat, house no., street")).toBeVisible();

  // Simulate 30 minutes of inactivity: push the stored session's expiry into the past.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("ss-auth")!);
    raw.state.session.expiresAt = Date.now() - 1000;
    localStorage.setItem("ss-auth", JSON.stringify(raw));
  });
  await page.reload();
  await expect(page).toHaveURL(/\/login\?reason=expired/);
  await expect(page.getByText(/session expired due to inactivity/)).toBeVisible();
  await page.getByLabel("Email or username").fill("customer@shopsphere.dev");
  await page.getByLabel("Password", { exact: true }).fill("Customer@123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel("Flat, house no., street")).toBeVisible();
});

test("MOD-08-001: a shipped fixture order shows a partial timeline", async ({ page }) => {
  await login(page, undefined, "/account/orders/SS-FX-00003");
  await expect(page.getByRole("list", { name: "Order progress" })).toBeVisible();
  const current = page.locator('[aria-current="step"]');
  await expect(current).toContainText("Shipped");
  await expect(page.getByText("Upcoming", { exact: true })).toHaveCount(2);
});

test("MOD-10: reviews are written from a delivered order and show as verified on the product page", async ({ page }) => {
  await login(page);
  await page.goto("/account/orders/SS-FX-00001");
  const writeBtn = page.getByRole("button", { name: /^Write a review for/ }).first();
  const label = (await writeBtn.getAttribute("aria-label"))!;
  const title = label.replace(/^Write a review for /, "");
  await writeBtn.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "5 stars" }).click();
  await dialog.getByLabel(/Headline/).fill("Excellent purchase");
  await dialog.getByLabel(/Your review/).fill("Arrived quickly and works exactly as described. Very happy.");
  await dialog.getByRole("button", { name: "Submit review" }).click();
  await expect(page.getByRole("button", { name: `Edit review for ${title}` })).toBeVisible();

  // The product page lists it (verified) but no longer has its own "Write a review" form.
  await page.getByRole("link", { name: title }).first().click();
  await expect(page.getByRole("heading", { name: "Ratings & reviews" })).toBeVisible();
  await expect(page.getByText("Excellent purchase")).toBeVisible();
  await expect(page.getByRole("button", { name: /Write a review/ })).toHaveCount(0);
});

test("cart selection: only ticked items are checked out; unticked items stay in the cart", async ({ page }) => {
  await login(page);
  const kept = await addSimpleProductToCart(page, 6);
  const bought = await addSimpleProductToCart(page, 1);
  await page.goto("/cart");
  const items = page.getByRole("region", { name: "Cart items" });
  await items.getByRole("checkbox", { name: `Select ${kept} for checkout` }).click();
  await expect(items.getByRole("checkbox", { name: "Select all items" })).not.toBeChecked();
  await expect(page.getByRole("button", { name: /Proceed to checkout \(1\)/ })).toBeEnabled();

  // Nothing ticked → checkout is disabled.
  await items.getByRole("checkbox", { name: `Select ${bought} for checkout` }).click();
  await expect(page.getByText("Select at least one item to check out.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Proceed to checkout/ })).toBeDisabled();
  await items.getByRole("checkbox", { name: `Select ${bought} for checkout` }).click();

  await page.getByRole("button", { name: /Proceed to checkout/ }).click();
  await page.getByRole("button", { name: "Continue to address" }).click();
  await page.getByLabel("Flat, house no., street").fill("12, Lake View Road");
  await page.getByLabel("City").fill("Chennai");
  await page.getByLabel("State").selectOption("Tamil Nadu");
  await page.getByLabel("Pincode").fill("600028");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  const review = page.getByRole("list", { name: "Items" });
  await expect(review.getByText(bought)).toBeVisible();
  await expect(review.getByText(kept)).toHaveCount(0);
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("radio", { name: /Cash on Delivery/ }).click();
  await page.getByRole("button", { name: /Pay ₹/ }).click();
  await expect(page.getByRole("heading", { name: /Your order is placed/ })).toBeVisible();

  await page.goto("/cart");
  await expect(items.getByText(kept)).toBeVisible();
  await expect(items.getByText(bought)).toHaveCount(0);
});
