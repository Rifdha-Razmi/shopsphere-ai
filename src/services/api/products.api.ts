import { z } from "zod";
import type { Category, Product } from "@/types";
import { MAX_SEARCH_LENGTH } from "@/lib/constants";
import { buildUrl, request } from "./http";
import { categoryListSchema, productListResponseSchema, rawProductSchema } from "./schemas";
import { normalizeProduct } from "@/services/catalog/normalize";

/**
 * DummyJSON product endpoints (PRD §10.2). Every function returns normalized
 * domain objects; nothing above this layer sees the raw API shape.
 */

export interface ProductPage {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

function toPage(res: z.infer<typeof productListResponseSchema>): ProductPage {
  return { products: res.products.map(normalizeProduct), total: res.total, skip: res.skip, limit: res.limit };
}

/** Whole catalogue (DummyJSON supports `limit=0`). Filtering/sorting happens client-side — see ARCHITECTURE.md. */
export async function fetchCatalog(signal?: AbortSignal): Promise<Product[]> {
  const res = await request(buildUrl("/products", { limit: 0 }), { schema: productListResponseSchema, signal });
  return toPage(res).products;
}

export async function fetchProducts(params: { limit?: number; skip?: number; sortBy?: string; order?: "asc" | "desc" } = {}, signal?: AbortSignal): Promise<ProductPage> {
  const res = await request(buildUrl("/products", params), { schema: productListResponseSchema, signal });
  return toPage(res);
}

export async function fetchProduct(id: number, signal?: AbortSignal): Promise<Product> {
  const raw = await request(buildUrl(`/products/${id}`), { schema: rawProductSchema, signal });
  return normalizeProduct(raw);
}

export async function searchProducts(query: string, params: { limit?: number } = {}, signal?: AbortSignal): Promise<ProductPage> {
  const q = query.trim().slice(0, MAX_SEARCH_LENGTH); // edge case 22: bounded request size
  if (!q) return { products: [], total: 0, skip: 0, limit: 0 };
  const res = await request(buildUrl("/products/search", { q, limit: params.limit ?? 0 }), { schema: productListResponseSchema, signal });
  return toPage(res);
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return request(buildUrl("/products/categories"), { schema: categoryListSchema, signal });
}

export async function fetchProductsByCategory(slug: string, signal?: AbortSignal): Promise<Product[]> {
  const res = await request(buildUrl(`/products/category/${encodeURIComponent(slug)}`, { limit: 0 }), { schema: productListResponseSchema, signal });
  return toPage(res).products;
}
