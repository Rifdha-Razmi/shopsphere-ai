import type { Product, ProductId } from "@/types";
import { buildVariants } from "./normalize";

/**
 * Admin edits are persisted locally (PRD §4.2 Data Write Policy). They are
 * layered on top of API data here so the storefront, cart validation and
 * recommendations all see one consistent catalogue.
 */
export interface CatalogOverrides {
  /** Field-level edits to API products. */
  edits: Record<ProductId, Partial<Pick<Product, "title" | "description" | "price" | "mrp" | "stock" | "category" | "brand" | "discountPercentage">>>;
  /** Products created in the admin dashboard. */
  created: Product[];
  /** Hard-deleted product ids (only allowed when no order references them). */
  deleted: ProductId[];
  /** Archived ids: hidden from the storefront but kept for order history (edge case 27). */
  archived: ProductId[];
  /** Locally created categories (slug -> display name), and renames of existing ones. */
  categoryNames: Record<string, string>;
}

export const EMPTY_OVERRIDES: CatalogOverrides = { edits: {}, created: [], deleted: [], archived: [], categoryNames: {} };

export function applyOverrides(products: Product[], overrides: CatalogOverrides): Product[] {
  const deleted = new Set(overrides.deleted);
  const archived = new Set(overrides.archived);
  const merged = products
    .filter((p) => !deleted.has(p.id))
    .map((p) => {
      const edit = overrides.edits[p.id];
      let next = p;
      if (edit) {
        next = { ...p, ...edit };
        if (edit.stock !== undefined && edit.stock !== p.stock) {
          // Re-split stock across variants so variant availability stays coherent.
          next.variants = p.variants.length ? buildVariants(p.id, next.category, edit.stock) : [];
        }
        if (edit.price !== undefined || edit.mrp !== undefined) {
          const mrp = Math.max(next.mrp, next.price);
          next.mrp = mrp;
          next.discountPercentage = mrp > next.price ? Math.round(((mrp - next.price) / mrp) * 100) : 0;
        }
      }
      return archived.has(p.id) ? { ...next, archived: true } : next;
    });
  const created = overrides.created.filter((p) => !deleted.has(p.id)).map((p) => (archived.has(p.id) ? { ...p, archived: true } : p));
  return [...merged, ...created];
}
