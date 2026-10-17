# Edge-Case Traceability (PRD §20)

All 27 edge cases from PRD §20, where each is handled, and which test proves it.

| # | Edge case | Behaviour | Where | Verified by |
|---|---|---|---|---|
| 1 | Product unavailable after adding to cart | Flagged in place; checkout blocked until it is removed, saved for later or unticked (only ticked lines are bought) | `cart.service.detectIssue`, `CartLine`, `useCartView.blocked` | unit `cart-service`, e2e `admin.spec`, `checkout.spec` (cart selection) |
| 2 | Product removed from API between loads | PDP shows "no longer available" + Trending alternatives | `useProduct` (404/deleted/archived), `ProductDetailView` | e2e `product-cart.spec` |
| 3 | Product API fails | Last cached catalogue shown with a retry banner (persisted query cache) | `useCatalog.isStale`, `StaleDataBanner`, `QueryProvider` | unit `normalize-and-api` (error mapping) |
| 4 | Slow network | Skeletons matching final layout | `ProductGridSkeleton`, `PdpSkeleton`, rail skeletons | manual |
| 5 | Empty search submitted | No request; recent/popular searches shown | `SearchBar.submit`, `useSearchSuggestions.enabled` | component `search-bar` |
| 6 | Search returns nothing | Distinct state + "Did you mean…?" + browse CTA | `DiscoveryView`, `suggestSpellings` | e2e `search-filter.spec` |
| 7 | min price > max price | Auto-swapped | `sanitizeFilters`, `PriceFilter` | unit `catalog-filter`, component `filter-panel` |
| 8 | Duplicate add to cart | Increments the existing line (for guests and signed-in customers) | `cart.store.add` | unit `cart-service` (merge), e2e `product-cart.spec` |
| 9 | Out-of-stock product viewed | Add to cart disabled with explanation + "Notify me" placeholder | `BuyBox` | component `product-card`, e2e (variant) |
| 10 | Price changed in cart | Old vs new price, explicit "Accept new price" | `CartLine` | component `cart-and-rails` |
| 11 | Invalid / expired coupon | Inline reason (not found / expired on date / minimum order) | `validateCoupon`, `CouponInput` | unit + e2e |
| 12 | Empty wishlist | Empty state + "Browse products" | `WishlistView` | e2e `product-cart.spec` |
| 13 | Empty order history | Empty state encouraging first purchase | `OrdersView` | manual |
| 14 | Payment fails | Failure state on the payment step only, retry | `CheckoutView.pay`, `simulatePayment` | e2e `checkout.spec` |
| 15 | Unparseable assistant query | Clarifying message + 3 prompts | `parseMessage` → `unknown` | unit + e2e |
| 16 | No recommendation candidates | Rail hides or falls back to *Popular Right Now* | `getRecommendations`, `RecommendationRail` | unit + component |
| 17 | Refresh mid-checkout | Step + typed address restored | `useCheckoutStore` (persisted), `AddressForm.onChange` | e2e `checkout.spec` |
| 18 | Session expires mid-checkout | Redirect to sign in with reason, back to the same step | `SessionWatcher`, `RequireAuth`, `LoginForm` | e2e `checkout.spec` |
| 19 | Invalid login | Field-specific inline error | `AuthError.field`, `LoginForm` | component + e2e |
| 20 | Missing / broken image | Placeholder, never a broken icon | `ProductImage` | manual |
| 21 | Malformed API response | Zod schemas with defaults; invalid items dropped | `services/api/schemas.ts` | unit `normalize-and-api` |
| 22 | Very long search query | `maxLength` 120 on input; request trimmed | `SearchBar`, `searchProducts` | manual |
| 23 | Recommended item out of stock / removed | Filtered out before render | `onlyAvailable` | unit |
| 24 | New user, no history | *Popular Right Now* instead of empty personal rails | `getRecommendations` (noSignals) | unit + e2e |
| 25 | Too few signals | Personalized blends with popularity by confidence | `buildSignalProfile.confidence`, `personalized` strategy | unit |
| 26 | Two tabs edit the cart | `storage` event → rehydrate; last write wins, lines merged by key | `StoreHydrator`, `mergeCartItems` | unit |
| 27 | Delete product referenced by an order | Delete blocked → offered "Archive" (kept for history, hidden from store) | `ProductsAdmin`, `applyOverrides` | e2e `admin.spec` |
