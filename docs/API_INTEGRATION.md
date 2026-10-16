# API Integration

## Data sources (PRD §10.2)

| Domain | Source | Notes |
|---|---|---|
| Products | `GET /products?limit=0` | Whole catalogue, cached by TanStack Query (`["catalog"]`, stale 5 min, persisted 24 h). |
| Product detail | `GET /products/:id` | Seeded from the catalogue cache for instant navigation; 404 → "no longer available". |
| Categories | `GET /products/categories` | `{ slug, name }[]`; admin renames/additions layered locally. |
| Search | `GET /products/search?q=&limit=` | Suggestions (`limit=6`) and full results; query trimmed to 120 chars. |
| Users | `GET /users?limit=0` | Admin → Customers. |
| Auth | `POST /auth/login` | Dev reference for DummyJSON usernames; local + seeded accounts are checked first. |
| Cart | Local (`useCartStore`) | DummyJSON `/carts` is a dev reference only — cart truth lives client-side (guest cart on this device, merged into the account on sign-in). |
| Recommendations | Local Recommendation Service | Not a DummyJSON endpoint. |
| Orders, reviews, analytics | Local fixtures + local persistence | See below. |

All requests go through `services/api/http.ts`:

- 12 s timeout with `AbortController`, cancellation from TanStack Query.
- Bearer token attached for `auth: true` requests.
- Errors normalised to `ApiError` (`network`, `timeout`, `http`, `not-found`, `unauthorized`, `parse`) with a safe `userMessage`.
- Every response is validated with **Zod** (`services/api/schemas.ts`). Optional fields fall back to defaults with `.catch()`; list items missing `id`/`title` are dropped instead of crashing (edge case 21).
- Retries: up to 2 with exponential back-off, except for `not-found`/`parse`.

## Normalisation

`services/catalog/normalize.ts` converts raw products into the `Product` domain type:

- **Prices:** USD → INR (`NEXT_PUBLIC_USD_TO_INR`, default 83), rounded to retail endings. DummyJSON `price` = MRP; selling price applies `discountPercentage`.
- **Variants:** deterministic size/colour variants for apparel, footwear, phones, bags, watches, sunglasses; stock split across them (some intentionally zero).
- **Images:** empty/broken images render a placeholder (edge case 20).

## Local fixtures (PRD §10.3)

| File | Contents |
|---|---|
| `src/mocks/orders.json` | 10 orders covering **every** tracking status (6 for the demo customer). Timestamps are hour offsets resolved at first load, so data never looks stale. |
| `src/mocks/reviews.json` | 67 reviews with ratings, verified flags and helpful counts. |
| `src/mocks/recommendations.json` | 142 frequently-bought-together pairs and per-product popularity scores for Trending. |
| `src/mocks/user-preferences.json` | Shape of the derived signals a new visitor starts with (price band, preferred categories and brands). |
| `src/mocks/analytics.json` | Seed baseline for the admin Recommendation Analytics panel (clearly labelled simulated). |
| `src/mocks/dummyjson/*.json` | Snapshot of DummyJSON's own product/user data for the offline mock API. |

## Offline mock API

`app/api/mock/[...path]/route.ts` implements the DummyJSON subset the app uses (`/products`, `/products/:id`, `/products/search`, `/products/categories`, `/products/category/:slug`, `/users`, `POST /auth/login`) from the snapshot, and serves generated SVG product art at `/api/mock/image/:id/:n`. Set `NEXT_PUBLIC_PRODUCT_API_URL=/api/mock` (or `npm run dev:mock`). E2E tests always use it for determinism.

## Write operations

DummyJSON doesn't persist writes, so every write in ShopSphere AI (orders, reviews, votes, review moderation, addresses, profile, admin edits, analytics) persists to `localStorage` in this browser. Admin pages that save data carry a *"Saved locally"* badge next to the title (PRD §4.2); analytics figures carry a *"Local Analytics"* badge (PRD §8.4).
