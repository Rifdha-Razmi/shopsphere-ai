import raw from "@/mocks/dummyjson/products.json";
import { rawProductSchema } from "@/services/api/schemas";
import { normalizeProduct } from "@/services/catalog/normalize";
import type { Product } from "@/types";

/** The real DummyJSON snapshot, normalized exactly as the app does it. */
export const snapshotCatalog: Product[] = (raw as unknown[]).map((p) => normalizeProduct(rawProductSchema.parse(p)));
