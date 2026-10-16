# AI Shopping Assistant (Rule-Based / Mock AI)

The assistant is **explicitly rule-based**: it uses keyword, pattern and entity extraction — no language model, no API key, nothing leaves the browser. This is stated in the panel header ("Rule-based assistant · no AI language model") and on `/help/assistant` (PRD §7.1).

## Pipeline

```
user text
  → parseMessage()        services/assistant/intent-parser.ts   (pure)
  → ParsedMessage { kind, intent, refinements, referenceIndex, confidence }
  → respond()             services/assistant/assistant.service.ts
       ├─ search / refine / topic-change → runIntent() → filterProducts() + sortProducts()   (same code as discovery)
       └─ similar                         → getRecommendations({ strategy: "similar" })       (same recommendation service)
  → AssistantReply { text, appliedFilters, productIds, suggestions, context }
```

The assistant is a new entry point into existing services, not a parallel implementation (PRD §7.3).

## Structured intent (PRD §7.3)

```
"Show me smartphones under 30,000 rupees with good ratings"
→ { categories: ["smartphones"], maxPrice: 30000, minRating: 4 }
```

| Entity | Examples understood |
|---|---|
| Category / product type | phones, headphones, earbuds, laptops, tablets, watches, shoes, sneakers, shirts, tops, dresses, bags, jewellery, sunglasses, perfume, makeup, skin care, furniture, decor, kitchen, groceries, sports, cricket, football, tennis, bikes, cars |
| Gender | men's / women's (narrows e.g. watches → `mens-watches`) |
| Price | under / below / within / up to ₹X · above / over X · between X and Y · X–Y · around X · `5k`, `1.5 lakh`, `30,000 rupees` |
| Rating | good / great / highly rated → 4★ · best / top rated → 4.5★ · "4 stars", "4+ ★" |
| Colour | black, blue, silver, red, green, white, gold, brown, … (matches variant colours or title/tags) |
| Brand | any brand present in the catalogue (Apple, Nike, Samsung, …) |

"Headphones" maps to DummyJSON's `mobile-accessories` category plus keyword constraints (`airpods`, `earphones`, `headphones`, `earbuds`) so speakers and chargers are excluded.

## Conversational refinement (PRD §7.4)

Context (`{ intent, lastResultIds }`) is kept for the session (sessionStorage).

| Follow-up | Behaviour |
|---|---|
| "Show me something cheaper" | `maxPrice = min(0.8 × current ceiling, median of shown results)` and re-query |
| "More expensive" / "premium" | `minPrice = median of shown`, ceiling removed |
| "Something with better ratings" | `minRating` → 4 if unset, else +0.3 (max 4.8); keeps category & price; sorts by rating |
| "Only in blue" | adds `color: "Blue"` on top of the current intent |
| "Under 3000" (constraint only) | merges into the current intent |
| "Show me more like the second one" | Similar Products strategy seeded with result #2 (results are numbered #1–#6 on the cards) |
| "Never mind, show me headphones instead" | topic change: new category; keeps the rating preference, and keeps the previous budget **only if** the new category has products within it (otherwise says it removed it) |

## Fallbacks

- **Unclear input (MOD-AI-003):** "hmm not sure" → a clarifying question with 3 suggested prompts; never unrelated products.
- **No matches:** explains, and suggests loosened queries (e.g. a higher budget, any rating, any colour).
- **Greeting / help:** short explanation of what it understands.
- **Failure:** if the catalogue is unavailable, an inline error bubble with **Retry**; conversation history is preserved.

## UI (PRD §7.2)

"Ask AI" in the header navigation, a floating ✦ button (desktop) and the bottom-bar "Ask AI" (mobile) open a right-hand panel (full-screen on mobile) with distinct user/assistant bubbles, applied-filter chips, numbered inline product cards, starter prompts, suggestion chips, a typing indicator, `role="log"` + `aria-live` for screen readers, Enter-to-send and a reset button. The assistant is a customer feature (PRD §4.3), so these entry points are hidden for admins.

## Future LLM integration

`services/assistant/provider.ts` defines `AssistantProvider`. A real LLM provider would call a **server route** (so no key ever ships to the browser) that returns the same `AssistantReply` shape — typically by asking the model to emit the `ShoppingIntent` JSON and still executing it with `runIntent()`. Register it with `setAssistantProvider()`; the chat UI is unchanged. This is optional and not part of the graded scope (PRD §7.6).
