# Testing Report

_Last run: all suites green — **152 unit/component tests** (15 files) and **31 end-to-end tests**. Typecheck clean, lint 0 errors, production build passes._

## How to run

```bash
npm test                 # Vitest: unit + component (jsdom)
npm run test:coverage    # with v8 coverage
npx playwright install chromium   # first time only
npm run test:e2e         # Playwright: builds + serves with the offline mock API
npm run screenshots      # captures all 37 screens at 3 breakpoints into docs/screenshots/
```

## 1. Unit tests — Vitest (`tests/unit`)

| Suite | Tests | Focus |
|---|---|---|
| `recommendation-scoring.test.ts` | 15 | Each scoring component in isolation with known inputs/outputs; weights sum to 1; PRD §6.2 worked example; signal profile (weights, decay, price band, search inference, confidence) |
| `recommendation-strategies.test.ts` | 19 | All 9 strategies return explainable, available, non-excluded items; strategies are distinct; MOD-01-001/002; first-visit fallback never duplicates Trending; availability filter; diversify; provider swap |
| `intent-parser.test.ts` | 27 | Amount/price/rating/category/gender/brand extraction; PRD §7.3 example; MOD-AI-001/002/003; cheaper / colour / ordinal / topic change |
| `assistant-service.test.ts` | 8 | Conversation logic over the real snapshot catalogue (search → refine → similar → fallback) |
| `cart-service.test.ts` | 13 | MOD-05-001 clamping; coupons (valid/invalid/expired/min order/cap); totals; all §5.5 issue types incl. variant stock; merge without duplicates |
| `catalog-filter.test.ts` | 12 | MOD-02-001 combined filter + sort; MOD-02-002; inverted ranges; sorting; pagination; facets; URL state round-trip and garbage params |
| `normalize-and-api.test.ts` | 9 | INR conversion; malformed API data; deterministic variants; admin overrides; HTTP error mapping (never leaks raw errors) |
| `auth-orders-reviews.test.ts` | 14 | JWT-shaped tokens and expiry; field-specific auth errors; hashing; safe redirects; MOD-08-001 timeline; auto-progress; verified purchase; review sorting; **admin review moderation (hide/show/delete)**; delivery estimates; mock payment; order building |
| `stores-and-utils.test.ts` | 11 | Cart store (clamp, save-for-later, guest → account merge, coupons, **cart selection: tick/untick, select all, remove only purchased lines**); wishlist; compare limit; analytics attribution; assistant provider; text/format utils |
| `role-routing.test.ts` | 3 | One sign-in, role-based landing: admins → `/admin`, customers back to where they were and never into `/admin` |

## 2. Component tests — React Testing Library (`tests/component`)

| Suite | Tests | Focus |
|---|---|---|
| `product-card.test.tsx` | 5 | Price/discount/rating rendering; add to cart; **guests can add to cart and wishlist without signing in (PRD §4.3)**; out-of-stock disabled; variant products route to options; wishlist + compare toggles |
| `filter-panel.test.tsx` | 2 | Brand / rating / availability / on-sale events; inverted price range swap (edge case 7) |
| `search-bar.test.tsx` | 2 | **Debounce (MOD-03-001):** no request while typing, exactly one after the pause; recent/popular on focus; clear history; empty input fires nothing (edge case 5) |
| `forms.test.tsx` | 6 | Login (accessible errors, wrong password → field error, success); Register (password rules, confirmation, phone, terms); Review form (rating + 3–1000 character policy, submit); checkout customer and address steps (validation + draft persistence) |
| `cart-and-rails.test.tsx` | 6 | Cart line clamping message; price-change confirmation; unavailable item removal; recommendation rail heading, empty-rail hiding, first-visit *Popular Right Now* fallback |

## 3. End-to-end — Playwright (`e2e/`)

Runs against a production build with `NEXT_PUBLIC_PRODUCT_API_URL=/api/mock` (deterministic, offline).

| Spec | Tests | Flows |
|---|---|---|
| `auth.spec.ts` | 7 | Protected route → login → back; invalid credentials; register → refresh persists → logout; guest Sign in → register link; **guest cart and wishlist without signing in → checkout asks to sign in → cart kept**; customer blocked from admin; **My account layout (no sidebar on orders, addresses on the profile page, old links redirect)** |
| `search-filter.spec.ts` | 4 | Live suggestions → results page, URL sort + back/forward; MOD-02-001 with chips; MOD-02-002 clear filters; spelling suggestions |
| `product-cart.spec.ts` | 6 | Variant add, duplicate increments, quantity clamp; MOD-04-001 sold-out variant; removed product; coupons; wishlist → move to cart; compare |
| `checkout.spec.ts` | 5 | Full 6-step checkout incl. refresh mid-address (MOD-06-002), declined payment → retry on the payment step → confirmation → tracking; MOD-06-001 session-expiry restore; MOD-08-001 shipped timeline; **MOD-10 review written from a delivered order, shown verified on the product page**; **cart selection: only ticked items are ordered, unticked items stay** |
| `recommendations-assistant.spec.ts` | 2 | First visit *Popular Right Now*; Recently Viewed order; *Because You Viewed*; rail click-through; assistant intent → refinement → fallback |
| `admin.spec.ts` | 6 | One login with role-based landing; admin stock edit → customer cart flags and blocks checkout; overview, order advance, Local Analytics label, delete → archive guard; admin shell (menu, profile, logout); **review moderation: hiding a review removes it from the store, showing it brings it back**; product edit form keeps its category when the category list loads slowly |
| `responsive.spec.ts` (Pixel 7) | 1 | Bottom bar, filter drawer, assistant on mobile; no horizontal overflow |

Every Section 5 module has at least one E2E happy path (PRD §17.4): MOD-01 (recommendations spec), MOD-02/03 (search-filter), MOD-04/05/09 (product-cart), MOD-06/08/10 (checkout), MOD-07 (auth: account layout, addresses).

### Manual cross-breakpoint check

A scripted walkthrough visited **108 page × screen-size combinations** — every storefront, account and admin page as guest, customer and admin, at 390 px, 820 px and 1440 px — and found **no console errors and no horizontal overflow**.

## 4. Coverage

Line coverage for the core logic (`src/services`, `src/lib`):

| Area | Lines |
|---|---|
| Recommendation engine (signals, scoring, strategies, mock engine, provider) | 100 / 100 / 99.6 / 100 / 100 % |
| Recommendation service | 92.6 % |
| Intent parser / assistant service | 96.6 % / 86.7 % |
| Cart service | 97.4 % |
| Orders service | 100 % |
| Auth service | 90.7 % |
| Catalog normalize / filter / overrides | 95.7 / 80.9 / 92.3 % |
| URL state, validation, safe redirect, role routing | 100 % |
| Reviews service | 59.3 % |

Overall project line coverage (including UI files exercised only by E2E) is ~41 %; UI behaviour is covered primarily by the Playwright suite.

## 5. Known gaps

- No automated visual-regression diffing (screenshots are captured, not compared).
- Accessibility is verified through semantic queries (roles/labels) in RTL/Playwright and manual keyboard checks; an automated axe scan is not yet wired in (next step: `@axe-core/playwright`).
- Network-failure states (stale-data banner, offline banner) are unit-tested at the service layer and checked manually, not via E2E network throttling.
- E2E runs against the mock API; the live DummyJSON integration is covered by manual smoke testing.
- The reviews service is covered mostly through E2E; its unit coverage (59 %) is the lowest of the core services.
