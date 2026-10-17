import type { Product, ProductVariant } from "@/types";
import type { RawProduct } from "@/services/api/schemas";
import { env } from "@/lib/env";
import { hashString } from "@/utils/hash";
import { retailRound } from "@/utils/math";

/**
 * Converts a raw DummyJSON product into the app's Product shape.
 *
 * Documented product decisions:
 *  - DummyJSON prices are USD; we present an INR storefront, converting with
 *    NEXT_PUBLIC_USD_TO_INR and rounding to retail price points.
 *  - DummyJSON's `price` is the list price (MRP); the selling price applies
 *    `discountPercentage`.
 *  - DummyJSON has no variants. For apparel, footwear, phones, bags,
 *    sunglasses and watches we derive deterministic size/colour variants and
 *    split the product's stock across them (some variants intentionally end up
 *    at zero stock so the out-of-stock-variant flow can be exercised).
 */

const SIZE_CATEGORIES: Record<string, string[]> = {
  "mens-shoes": ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10"],
  "womens-shoes": ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7"],
  "mens-shirts": ["S", "M", "L", "XL", "XXL"],
  tops: ["XS", "S", "M", "L", "XL"],
  "womens-dresses": ["XS", "S", "M", "L", "XL"],
};

const COLOR_CATEGORIES = new Set(["smartphones", "womens-bags", "sunglasses", "mens-watches", "womens-watches", "mobile-accessories", "tablets", "laptops"]);
const COLOR_PALETTE = ["Black", "Blue", "Silver", "Red", "Green", "White", "Gold", "Brown"];

export function buildVariants(productId: number, category: string, totalStock: number): ProductVariant[] {
  const seed = hashString(`variants:${productId}`);
  let labels: { attributes: ProductVariant["attributes"] }[] = [];

  if (SIZE_CATEGORIES[category]) {
    labels = SIZE_CATEGORIES[category].map((size) => ({ attributes: { size } }));
  } else if (COLOR_CATEGORIES.has(category) && seed % 4 !== 0) {
    const count = 2 + (seed % 3); // 2–4 colours
    const start = seed % COLOR_PALETTE.length;
    labels = Array.from({ length: count }, (_, i) => ({
      attributes: { color: COLOR_PALETTE[(start + i * 3) % COLOR_PALETTE.length] },
    }));
  }
  if (labels.length === 0) return [];

  // Split stock deterministically. One variant is forced to 0 for ~1/3 of products.
  const forcedOut = seed % 3 === 0 ? seed % labels.length : -1;
  const weights = labels.map((_, i) => (i === forcedOut ? 0 : 1 + (hashString(`${productId}:${i}`) % 5)));
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  let remaining = totalStock;
  const stocks = weights.map((w, i) => {
    if (i === weights.length - 1) return Math.max(0, remaining);
    const s = Math.floor((totalStock * w) / weightSum);
    remaining -= s;
    return s;
  });
  // Ensure the remainder never lands on the forced-out variant.
  if (forcedOut === labels.length - 1 && stocks[forcedOut] > 0) {
    const target = forcedOut === 0 ? 1 : 0;
    stocks[target] += stocks[forcedOut];
    stocks[forcedOut] = 0;
  }

  return labels.map((label, i) => ({
    id: Object.values(label.attributes).join("-").toLowerCase().replace(/\s+/g, "-"),
    attributes: label.attributes,
    stock: stocks[i],
  }));
}

export function toInr(usd: number): number {
  return Math.max(0, usd * env.usdToInr);
}

export function normalizeProduct(raw: RawProduct): Product {
  const mrp = retailRound(toInr(raw.price));
  const discount = Math.max(0, Math.min(90, raw.discountPercentage));
  const price = discount >= 1 ? retailRound(mrp * (1 - discount / 100)) : mrp;
  const stock = Math.max(0, Math.floor(raw.stock));
  const images = raw.images.filter((src) => typeof src === "string" && src.length > 0);

  return {
    id: raw.id,
    title: raw.title.trim(),
    description: raw.description,
    category: raw.category,
    brand: raw.brand?.trim() || "Generic",
    tags: Array.from(new Set(raw.tags.map((t) => t.toLowerCase().trim()).filter(Boolean))),
    price: Math.min(price, mrp),
    mrp,
    discountPercentage: price < mrp ? Math.round(((mrp - price) / mrp) * 100) : 0,
    rating: Math.max(0, Math.min(5, raw.rating)),
    reviewCount: raw.reviews.length,
    stock,
    sku: raw.sku,
    thumbnail: raw.thumbnail || images[0] || "",
    images: images.length ? images : raw.thumbnail ? [raw.thumbnail] : [],
    warrantyInformation: raw.warrantyInformation,
    shippingInformation: raw.shippingInformation,
    returnPolicy: raw.returnPolicy,
    minimumOrderQuantity: raw.minimumOrderQuantity,
    weight: raw.weight,
    dimensions: raw.dimensions ?? null,
    createdAt: raw.meta?.createdAt || "2024-01-01T00:00:00.000Z",
    variants: buildVariants(raw.id, raw.category, stock),
    sourceReviews: raw.reviews.map((r) => ({ rating: r.rating, comment: r.comment, date: r.date, reviewerName: r.reviewerName })),
  };
}

export function variantLabel(variant: ProductVariant | null | undefined): string | null {
  if (!variant) return null;
  const parts = [];
  if (variant.attributes.size) parts.push(`Size ${variant.attributes.size}`);
  if (variant.attributes.color) parts.push(variant.attributes.color);
  return parts.join(" · ") || null;
}

/** Stock for a specific variant, or the product total when there are no variants. */
export function stockFor(product: Product, variantId: string | null): number {
  if (!variantId || product.variants.length === 0) return product.stock;
  return product.variants.find((v) => v.id === variantId)?.stock ?? 0;
}
