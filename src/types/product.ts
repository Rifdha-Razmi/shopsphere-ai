/**
 * Domain types for the catalogue. These are the *normalized* shapes the app
 * works with — raw DummyJSON responses are parsed into these by
 * `services/api/schemas.ts`, never used directly by UI code.
 */

export type ProductId = number;

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ProductVariant {
  id: string;
  /** e.g. { size: "UK 8", color: "Blue" } */
  attributes: Partial<Record<VariantAttribute, string>>;
  stock: number;
}

export type VariantAttribute = "size" | "color";

export interface ProductSourceReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
}

export interface Product {
  id: ProductId;
  title: string;
  description: string;
  category: string;
  brand: string;
  tags: string[];
  /** Selling price in INR (after discount). */
  price: number;
  /** List price in INR before discount ("MRP"). Equal to price when no discount. */
  mrp: number;
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  thumbnail: string;
  images: string[];
  warrantyInformation: string;
  shippingInformation: string;
  returnPolicy: string;
  minimumOrderQuantity: number;
  weight: number;
  dimensions: ProductDimensions | null;
  createdAt: string;
  variants: ProductVariant[];
  sourceReviews: ProductSourceReview[];
  /** True for products created locally in the admin dashboard. */
  isLocal?: boolean;
  /** True when an admin archived the product (kept for order history). */
  archived?: boolean;
}

export interface Category {
  slug: string;
  name: string;
}

export type SortOption = "relevance" | "price-asc" | "price-desc" | "rating" | "newest";

export type Availability = "all" | "in-stock" | "out-of-stock";

export interface ProductFilters {
  categories: string[];
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  availability: Availability;
  onSale: boolean;
  /** Free-text keyword filter (search page / assistant). */
  query?: string;
  /** Variant attribute filter (assistant "only in blue"). */
  color?: string | null;
}

export const EMPTY_FILTERS: ProductFilters = {
  categories: [],
  brands: [],
  minPrice: null,
  maxPrice: null,
  minRating: null,
  availability: "all",
  onSale: false,
  query: "",
  color: null,
};
