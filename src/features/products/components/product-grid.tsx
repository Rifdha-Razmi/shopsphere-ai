import type { Product } from "@/types";
import { ProductCard, ProductCardSkeleton } from "./product-card";

/** Responsive grid: 2 cols mobile → 3 tablet → 4 laptop → 5 desktop (PRD §5.2/§15). */
export const GRID_CLASSES = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className={GRID_CLASSES} aria-label="Products">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className={GRID_CLASSES} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading products…</span>
    </div>
  );
}
