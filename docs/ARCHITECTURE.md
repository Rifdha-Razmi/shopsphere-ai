# Architecture

This document explains how ShopSphere AI is organised, how state flows, and which layer is responsible for what (PRD §9, §12, §25).

## 1. Principles

1. **Feature-based organisation.** Each domain (`cart`, `recommendations`, `ai-assistant`, …) lives in `src/features/<domain>/` with its own `components/` and `hooks/`.
2. **Strict layering.** UI → hooks → services → API/data. Components never call `fetch` and never contain scoring or filtering logic.
3. **One state approach per kind of state.**
   - *Server/cache state* (catalogue, product detail, categories, search, users) → **TanStack Query**.
   - *Client state* (cart, wishlist, auth session, checkout progress, signals, orders, reviews, admin overrides, UI) → **Zustand**.
   - They are never mixed: no server data is copied into Zustand, and no client state is stored in the query cache.
4. **Framework-agnostic services.** Everything in `src/services/` is plain TypeScript. An ESLint rule (`eslint.config.mjs`) fails the build if a service imports React, Next, UI components, hooks or stores.

## 2. Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│ app/ (routes)          thin: metadata + render a feature view         │
├──────────────────────────────────────────────────────────────────────┤
│ features/*/components  feature UI (DiscoveryView, CartView, …)        │
│ components/            shared primitives (ui/), common/, layout/      │
├──────────────────────────────────────────────────────────────────────┤
│ features/*/hooks       bridge: useCatalog, useCartView,               │
│ hooks/                 useRecommendations, useAssistant, …            │
├──────────────────────────────────────────────────────────────────────┤
│ store/ (Zustand)       client state        │ TanStack Query cache     │
├──────────────────────────────────────────────────────────────────────┤
│ services/              pure logic: catalog, cart, checkout, orders,   │
│                        reviews, auth, recommendations, assistant      │
├──────────────────────────────────────────────────────────────────────┤
│ services/api           HTTP client + Zod schemas → DummyJSON          │
│ mocks/                 local JSON fixtures                            │
└──────────────────────────────────────────────────────────────────────┘
```

| Layer | Responsibility | Must not |
|---|---|---|
| `components/` | Presentational UI, layout, accessibility | Fetch data or hold business logic |
| `features/*` | Feature-scoped components/hooks | Reach into another feature's internals |
| `services/` | API calls, scoring, intent parsing, totals, validation of business rules | Import React or render UI |
| `store/` | Global client state | Own server data |
| `hooks/` | Reusable stateful logic bridging services and components | Duplicate service logic |

## 3. Data flow examples

**Catalogue.** `useCatalog()` → TanStack Query (`["catalog"]`, 5-min stale time) → `fetchCatalog()` → `request()` validates with Zod → `normalizeProduct()` (INR, variants). The hook then layers **admin overrides** from `useAdminStore` via the pure `applyOverrides()`, so the storefront, cart validation and recommendations all see one consistent catalogue.

**Cart.** `useCartStore` holds lines with a *snapshot* of each product. `useCartView()` joins lines with the live catalogue and calls `detectIssue()` per line (out of stock / insufficient / unavailable / price changed) and `calculateTotals()`. If the catalogue can't load, lines fall back to their snapshots and checkout is blocked with a retry banner.

**Cart selection.** Each line has a checkbox (new lines start ticked; the store keeps the keys the customer *unticked* in `deselected`). `useCartView()` totals only the ticked lines, and only ticked lines with an issue block checkout. After payment, `removeOrdered(keys)` removes just the purchased lines, so unticked items stay in the cart. "Buy now" on a product page ticks only that product.

**Reviews.** Reviews are written from a *delivered* order (`OrderReviewButton` on the order detail page), so every new review is a verified purchase. The product page lists, sorts, filters and votes on reviews. `useProductReviews()` merges locally written, fixture and DummyJSON reviews and drops any an admin has hidden (`reviews.store.hidden`).

**Recommendations.** See §5 below and `RECOMMENDATION_ENGINE.md`.

## 4. Routing & rendering

- `app/(store)/` — storefront group with header, footer, mobile bottom bar and lazily loaded overlays (assistant, quick view, compare tray via `next/dynamic`, `ssr: false`).
- `app/admin/` — separate shell; wrapped in `RequireAuth role="admin"`.
- Route pages are server components that render client feature views. Data is client-fetched because personalization depends on browser-local signals; the catalogue cache is persisted so repeat visits render instantly.
- `src/proxy.ts` (Next 16's replacement for `middleware.ts`) redirects unauthenticated requests to `/checkout`, `/account`, `/admin` and non-admins away from `/admin`, using a non-sensitive `role.expiresAt` cookie. `/cart` and `/wishlist` stay open to guests (PRD §4.3) but send admins to `/admin`. Client guards (`RequireAuth`, with `allowGuests` for cart/wishlist) re-validate the token (defence in depth).
- One sign-in page for both roles: `homeForRole()` (`lib/role-routing.ts`) sends admins to `/admin` and customers back to the page they came from.

## 5. Recommendation architecture (PRD §6.4)

```
RecommendationRail (UI)            features/recommendations/components
        │
useRecommendations() hook          features/recommendations/hooks
        │   assembles signals via useRecommendationContext()
Recommendation Service             services/recommendations/recommendation.service.ts
        │   orchestration · signal/context building · 60s cache · availability filter · Trending fallback
Recommendation Provider            services/recommendations/provider.ts  (interface + swap point)
        │
Mock Recommendation Engine         services/recommendations/engine/{signals,scoring,strategies,mock-engine}.ts
        │
Product dataset                    DummyJSON + mocks/recommendations.json + local orders
```

`setRecommendationProvider()` swaps in any object implementing `RecommendationProvider` — a unit test proves the service and callers work unchanged with a fake "ML" provider.

## 6. State persistence & sync

- Every Zustand store uses `persist` with `skipHydration`; `StoreHydrator` rehydrates them after mount to avoid SSR mismatches and then flips a `hydrated` flag that gates personalised UI.
- **Cross-tab consistency (edge case 26):** a `storage` event listener rehydrates the store another tab wrote — last write wins and merges never duplicate lines (`mergeCartItems`).
- **Guest vs account (PRD §4.3):** guests can add to cart (kept on this device) and use a session-only wishlist. Carts and wishlists swap on sign-in/out (`switchOwner`): the guest cart and wishlist merge into the account, and a guest wishlist is cleared when a new browser session starts. Checkout always requires sign-in. `useCanShop()` blocks only admins from shopping.
- The assistant conversation uses `sessionStorage` (session-scoped by design).

## 7. Authentication (PRD §11)

`services/auth/auth.service.ts` issues a JWT-shaped token (`header.payload.signature`, `exp`, `sub`, `role`). The HTTP client attaches it as a Bearer header via a registered token provider. Sessions slide forward on activity and expire after `NEXT_PUBLIC_SESSION_TTL_MINUTES` of inactivity; `SessionWatcher` detects expiry and, on protected pages, redirects to sign-in with `reason=expired&next=…`. Because checkout progress is persisted separately, the customer resumes on the same step (MOD-06-001).

## 8. Performance (PRD §12)

- Route-level code splitting (App Router) plus `next/dynamic` for the assistant, quick view, compare tray and admin analytics.
- `next/image` with responsive `sizes`, lazy loading below the fold and `priority` for above-the-fold images.
- Debounced search (350 ms) and TanStack Query de-duplication/caching; catalogue persisted to storage.
- URL pagination (20 per page) keeps DOM size bounded; rails are horizontally scrolled lists of ≤12.
- `React.memo` on `ProductCard`; `useMemo` for filtering, facets, signal profiles and joins.
- Skeletons sized like the final content to avoid layout shift (CLS).

**Trade-off:** the catalogue is fetched once (≈190 products) rather than paged from the API, because DummyJSON can't filter by price/rating/brand server-side. At real-catalogue scale the filter service would move behind a search API without changing the UI contract.

## 9. Accessibility (PRD §14)

Semantic landmarks and a skip link; Radix primitives for dialogs/sheets/menus/tabs/radios (focus trap, Escape, focus return); WAI-ARIA combobox for search; live regions for cart count, filter result counts, assistant messages and stock status; `aria-invalid` + `aria-describedby` on every form field; errors use icon + text, never colour alone; visible focus rings; `prefers-reduced-motion` respected.

## 10. Security (PRD §13)

No secrets or API keys anywhere (`.env.example` contains only public flags). All forms validated with Zod. User content (reviews, names) is rendered as text — no `dangerouslySetInnerHTML` in the codebase. API responses are schema-validated; errors are normalised to `ApiError.userMessage` so raw errors/stack traces never reach the UI. Post-login redirects are restricted to same-origin relative paths (`safeNext`). Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`. Avatar uploads are type- and size-checked.

## 11. Scaling path (PRD §25)

| Today (build phase) | Scaled platform | What changes |
|---|---|---|
| DummyJSON + fixtures | Backend API + database | `services/api/*` endpoints only |
| Local orders/reviews in Zustand | Server persistence | store actions call API mutations (TanStack `useMutation`) |
| Mock JWT | Auth service (OIDC) | `auth.service.ts` + `proxy.ts` verification |
| Simulated payment | Payment gateway | `simulatePayment()` → server route |
| Rule-based engine | ML/LLM provider | `setRecommendationProvider()` / `setAssistantProvider()` |
| Local analytics | Analytics pipeline | `analytics.store` → event endpoint |

## 12. Shared UI building blocks

| Piece | Where | Used for |
|---|---|---|
| `PrimaryNav` | `components/layout/primary-nav.tsx` | Header row: Categories mega-menu, Home, All Products, My Orders, Ask AI (hidden for admins) |
| `Hero` | `features/home/components/hero.tsx` | Promotional banner carousel; loops forward only (a copy of slide 1 sits at the end) |
| `AuthShell` | `features/auth/components/auth-shell.tsx` | Split sign-in / create-account layout with a brand panel of top-rated products |
| `AccountShell` | `features/account/components/account-shell.tsx` | "My account" sidebar card (Profile, My reviews, Recommendation preferences); orders and history pages are full width |
| `AdminShell` | `features/admin/components/admin-shell.tsx` | Collapsible admin sidebar, profile menu, `AdminPageHeader` with "Saved locally" / "Local Analytics" scope badges (PRD §4.2, §8.4) |
| `BRAND_PANEL` | `lib/brand.ts` | The one indigo gradient shared by the footer, account card, admin sidebar and auth panel |

