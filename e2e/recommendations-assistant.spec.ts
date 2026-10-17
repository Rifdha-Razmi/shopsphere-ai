import { expect, test } from "@playwright/test";

test("first visit shows Popular Right Now; browsing creates Recently Viewed + personal rails", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Popular Right Now" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently Viewed" })).toHaveCount(0);

  await page.goto("/product/124");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("iPhone X");
  await expect(page.getByTestId("rail-similar")).toBeVisible();
  await page.goto("/product/122");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("iPhone 6");
  await expect(page.getByTestId("rail-similar")).toBeVisible();
  await page.goto("/");
  const recent = page.getByTestId("rail-recently-viewed");
  await expect(recent).toBeVisible();
  await expect(recent.getByRole("heading", { level: 3 }).first()).toHaveText("iPhone 6");
  await expect(page.getByRole("heading", { name: /Because You Viewed iPhone 6/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommended For You" })).toBeVisible();

  // click-through from a recommendation rail
  const card = page.getByTestId("rail-similar").locator("article").first();
  const name = (await card.getByRole("heading").textContent())!.trim();
  await card.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("AI assistant: structured intent, refinement and fallback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open AI shopping assistant" }).click();
  const input = page.getByLabel("Message the shopping assistant");
  await input.fill("Show me headphones under 15000");
  await input.press("Enter");
  const log = page.getByRole("log", { name: "Conversation" });
  await expect(log.getByText("Max price: ₹15,000")).toBeVisible();
  await expect(log.getByRole("list", { name: "Suggested products" }).first()).toBeVisible();

  await input.fill("show me something with better ratings");
  await input.press("Enter");
  await expect(log.getByText("Rating: 4★ & up")).toBeVisible();
  await expect(log.getByText("Category: headphones").last()).toBeVisible();

  await input.fill("hmm not sure");
  await input.press("Enter");
  await expect(log.getByText(/I'm not sure what you're looking for/)).toBeVisible();
});
