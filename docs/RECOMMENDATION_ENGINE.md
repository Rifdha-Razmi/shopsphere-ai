# Recommendation Engine

The engine is rule-based, deterministic and **explainable**: every recommendation is traceable to a signal, and every rail is titled by the signal behind it (PRD §6). Code: `src/services/recommendations/`.

## 1. Signals (PRD §6.1)

Collected on the client and assembled by `useRecommendationContext()`:

| Signal | Source | Weight in profile |
|---|---|---|
| Recently viewed | `useSignalsStore.recentlyViewed` (max 30, most recent first) | 1.0 × 0.85^position (recency decay) |
| Search history | `useSignalsStore.searchHistory` (max 8) | 0.6 — matched against category and tag names |
| Wishlist | `useWishlistStore` | 1.5 |
| Cart | `useCartStore` | 2.0 |
| Previous purchases | signed-in customer's orders | 1.5 |
| Category / subcategory, tags, brand, rating, price | product dataset | used by scoring |

`buildSignalProfile()` turns these into normalized (`max = 1`) **category, tag and brand affinities**, a **price band** (`0.75 × P20` … `1.3 × P80`, plus the median), and a **confidence** = `min(1, totalSignals / 6)`.

## 2. Scoring model (PRD §6.2)

```
score(product) =
    0.24 · categoryMatch          affinity of the product's category
  + 0.14 · priceSimilarity        1 − |ln(price / median)| / ln 3   (0 beyond a 3× ratio)
  + 0.18 · tagOverlap             mean affinity of the product's tags
  + 0.10 · normalizedRating       rating / 5, damped for products with < 3 reviews
  + 0.14 · recentlyViewedRelation max similarity to viewed items (0.9 decay per older item)
  + 0.08 · wishlistRelation       max similarity to wishlist items
  + 0.12 · cartRelation           max(similarity, co-purchase strength) with cart items
```

- Each component is clamped to `[0, 1]` and the weights sum to 1, so no single signal can dominate unintentionally.
- `productSimilarity(a, b) = 0.5 · sameCategory + 0.5 · Jaccard(tags)`.
- **Low-signal blending (edge case 25):** Personalized uses `confidence · personal + (1 − confidence) · popularity`.
- `explainBreakdown()` names the strongest weighted component, shown under each card ("In your usual price range", "Goes with your cart", …).

**Worked example (tested).** After viewing running shoes (footwear, tags `footwear/running`, ₹3,200, 4.4★), a running backpack (bags, `running/bags`, ₹3,000, 4.3★) scores on `tagOverlap` and `priceSimilarity ≈ 0.94`, beating an unrelated ₹45,000 sofa — see `tests/unit/recommendation-scoring.test.ts`.

## 3. The nine strategies (PRD §6.3)

| # | Strategy | Logic | Rail title | Placement |
|---|---|---|---|---|
| 1 | Recently Viewed | View history, most recent first | *Recently Viewed* | Home, account |
| 2 | Similar Products | Seed-only profile (category + tags + price of current product), `SIMILAR_WEIGHTS` | *Similar Products* / *Because You Viewed {product}* | PDP, home, assistant |
| 3 | Category-Based | Requested or dominant category, ranked by composite score | *Because You Browse {Category}* / *Related in {Category}* | Home, category pages, PDP |
| 4 | Price-Based | Items inside the price band, ranked by price similarity + quality + interest | *In Your Price Range (₹a–₹b)* | Home, search results |
| 5 | Wishlist-Based | Similarity to wishlist items | *Because of Your Wishlist* | Wishlist page, home |
| 6 | Cart-Based | Co-purchase strength + complementary categories + cheaper add-ons | *Goes Well With Your Cart* | Cart |
| 7 | Frequently Bought Together | Co-occurrence (seed pairs + local orders), complements fill gaps | *Frequently Bought Together* | PDP, order confirmation |
| 8 | Trending | Seed popularity (50%) + quality (35%) + review momentum (15%) | *Trending Now* | Home |
| 9 | Personalized For You | Full composite score blended with popularity by confidence | *Recommended For You* / *You May Also Like* | Home, PDP, dashboard |

Rails are diversified (max 2–3 items per category) so they don't collapse into one category.

## 4. Service guarantees

`recommendation.service.ts`:

- **Availability filter (edge case 23):** out-of-stock and archived products are removed before rendering.
- **Fallback (edge case 16):** when a strategy has no candidates — or a brand-new visitor has no signals — rails that opt in fall back to Trending titled *Popular Right Now* (skipping Trending's head so it never duplicates the Trending rail). Other rails hide.
- **Caching:** 60 s in-memory cache keyed by provider, request, catalogue fingerprint and signals; TanStack Query caches at the hook level.
- **Conceptual endpoints:** `recommendationEndpoints["GET /recommendations/personalized" | "…/similar/:productId" | "…/trending" | "…/frequently-bought/:productId"]`.

## 5. Swapping in ML/LLM

```ts
import { setRecommendationProvider } from "@/services/recommendations/provider";
setRecommendationProvider(new HttpRecommendationProvider("/api/recommendations")); // implements RecommendationProvider
```

No hook, component or service change is needed — covered by a unit test that injects a fake provider.

## 6. Observability

Rails record **impressions** (when ≥40 % visible, once per result set), **clicks** and **click-attributed add-to-carts** per strategy in `useAnalyticsStore`. *Admin → Recommendation analytics* shows impressions, CTR, conversion and per-strategy engagement (seeded baseline + live local events, labelled *Local Analytics*).

## 7. Transparency

Every recommendation is explainable in the UI at two levels (PRD §6, §6.3):

- **Rail headings name the signal** — *Because You Viewed {product}*, *Because You Browse {Category}*, *In Your Price Range (₹a–₹b)*, *Because of Your Wishlist*, *Goes Well With Your Cart*, *Recommended For You*.
- **Each product card carries a short reason label** from the engine (e.g. *Similar to …*, *Trending this week*, *Bought together 8× by shoppers*).

*Account → Recommendation preferences* is the transparency panel (PRD §5.7): signal counts, "Because you viewed …", the typical price range, category/brand/tag affinities with their scores, the scoring weights, and buttons to reset browsing signals or clear search history. The numbers update live as the customer browses, searches, saves and buys.
