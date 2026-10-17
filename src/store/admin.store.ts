import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product, ProductId } from "@/types";
import { EMPTY_OVERRIDES, type CatalogOverrides } from "@/services/catalog/overrides";
import type { AdminProductValues } from "@/lib/validation";
import { buildVariants } from "@/services/catalog/normalize";

/**
 * Admin write actions — persisted to THIS browser only (PRD §4.2). Every
 * admin screen that writes through this store shows a "Saved locally" label.
 */
interface AdminState extends CatalogOverrides {
  lastSavedAt: number | null;
  editProduct: (id: ProductId, values: AdminProductValues) => void;
  createProduct: (values: AdminProductValues) => Product;
  deleteProduct: (id: ProductId) => void;
  archiveProduct: (id: ProductId) => void;
  restoreProduct: (id: ProductId) => void;
  setStock: (id: ProductId, stock: number) => void;
  createCategory: (slug: string, name: string) => void;
  renameCategory: (slug: string, name: string) => void;
  assignCategory: (id: ProductId, category: string) => void;
  resetAll: () => void;
}

const now = () => Date.now();
/** Local product ids start high so they never collide with DummyJSON ids. */
const LOCAL_ID_BASE = 100000;

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      ...EMPTY_OVERRIDES,
      lastSavedAt: null,

      editProduct: (id, values) => {
        const created = get().created.find((p) => p.id === id);
        if (created) {
          const updated: Product = { ...created, ...values, discountPercentage: values.mrp > values.price ? Math.round(((values.mrp - values.price) / values.mrp) * 100) : 0 };
          if (values.stock !== created.stock) updated.variants = [];
          set({ created: get().created.map((p) => (p.id === id ? updated : p)), lastSavedAt: now() });
          return;
        }
        set({ edits: { ...get().edits, [id]: { ...get().edits[id], ...values } }, lastSavedAt: now() });
      },

      createProduct: (values) => {
        const id = LOCAL_ID_BASE + get().created.length + 1 + Math.floor(Math.random() * 1000) * 1000;
        const product: Product = {
          id,
          title: values.title,
          description: values.description,
          category: values.category,
          brand: values.brand,
          tags: [values.category.replace(/-/g, " ")],
          price: values.price,
          mrp: values.mrp,
          discountPercentage: values.mrp > values.price ? Math.round(((values.mrp - values.price) / values.mrp) * 100) : 0,
          rating: 0,
          reviewCount: 0,
          stock: values.stock,
          sku: `LOCAL-${id}`,
          thumbnail: "",
          images: [],
          warrantyInformation: "No warranty",
          shippingInformation: "Ships in 3-5 business days",
          returnPolicy: "7 days return policy",
          minimumOrderQuantity: 1,
          weight: 0,
          dimensions: null,
          createdAt: new Date().toISOString(),
          variants: buildVariants(id, values.category, values.stock),
          sourceReviews: [],
          isLocal: true,
        };
        set({ created: [...get().created, product], lastSavedAt: now() });
        return product;
      },

      deleteProduct: (id) => set({ deleted: [...new Set([...get().deleted, id])], created: get().created.filter((p) => p.id !== id), lastSavedAt: now() }),
      archiveProduct: (id) => set({ archived: [...new Set([...get().archived, id])], lastSavedAt: now() }),
      restoreProduct: (id) => set({ archived: get().archived.filter((a) => a !== id), lastSavedAt: now() }),
      setStock: (id, stock) => {
        const created = get().created.find((p) => p.id === id);
        if (created) set({ created: get().created.map((p) => (p.id === id ? { ...p, stock, variants: buildVariants(id, p.category, stock) } : p)), lastSavedAt: now() });
        else set({ edits: { ...get().edits, [id]: { ...get().edits[id], stock } }, lastSavedAt: now() });
      },
      createCategory: (slug, name) => set({ categoryNames: { ...get().categoryNames, [slug]: name }, lastSavedAt: now() }),
      renameCategory: (slug, name) => set({ categoryNames: { ...get().categoryNames, [slug]: name }, lastSavedAt: now() }),
      assignCategory: (id, category) => {
        const created = get().created.find((p) => p.id === id);
        if (created) set({ created: get().created.map((p) => (p.id === id ? { ...p, category } : p)), lastSavedAt: now() });
        else set({ edits: { ...get().edits, [id]: { ...get().edits[id], category } }, lastSavedAt: now() });
      },
      resetAll: () => set({ ...EMPTY_OVERRIDES, lastSavedAt: now() }),
    }),
    { name: "ss-admin", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

export const selectOverrides = (s: AdminState): CatalogOverrides => ({ edits: s.edits, created: s.created, deleted: s.deleted, archived: s.archived, categoryNames: s.categoryNames });
