import type { Product } from "@/types";

let nextId = 1000;

export function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? nextId++;
  return {
    id,
    title: `Product ${id}`,
    description: "A test product description",
    category: "smartphones",
    brand: "Acme",
    tags: ["smartphones"],
    price: 1000,
    mrp: 1200,
    discountPercentage: 17,
    rating: 4.2,
    reviewCount: 3,
    stock: 20,
    sku: `SKU-${id}`,
    thumbnail: "",
    images: [],
    warrantyInformation: "",
    shippingInformation: "",
    returnPolicy: "",
    minimumOrderQuantity: 1,
    weight: 1,
    dimensions: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    variants: [],
    sourceReviews: [],
    ...overrides,
  };
}
