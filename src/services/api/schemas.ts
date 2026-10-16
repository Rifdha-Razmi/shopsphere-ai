import { z } from "zod";

/**
 * Defensive schemas for DummyJSON responses (edge case 21). Optional fields
 * fall back to safe defaults with `.catch()`, so one malformed field degrades
 * gracefully instead of crashing the page. Items missing an id or title are
 * dropped rather than rendered.
 */

const str = (fallback = "") => z.string().catch(fallback);
const num = (fallback = 0) => z.coerce.number().refine(Number.isFinite).catch(fallback);

export const rawReviewSchema = z.object({
  rating: num(0),
  comment: str(),
  date: str(""),
  reviewerName: str("Anonymous"),
});

export const rawProductSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().min(1),
  description: str(),
  category: str("uncategorized"),
  price: num(0),
  discountPercentage: num(0),
  rating: num(0),
  stock: num(0),
  tags: z.array(z.string()).catch([]),
  brand: z.string().optional().catch(undefined),
  sku: str(""),
  weight: num(0),
  dimensions: z.object({ width: num(), height: num(), depth: num() }).nullable().optional().catch(null),
  warrantyInformation: str(""),
  shippingInformation: str(""),
  returnPolicy: str(""),
  minimumOrderQuantity: num(1),
  reviews: z.array(rawReviewSchema).catch([]),
  meta: z.object({ createdAt: str("") }).partial().optional().catch(undefined),
  images: z.array(z.string()).catch([]),
  thumbnail: str(""),
});

export type RawProduct = z.infer<typeof rawProductSchema>;

/** Parses a list leniently: invalid items are skipped, not fatal. */
export const lenientProductArray = z.array(z.unknown()).transform((items) =>
  items.flatMap((item) => {
    const parsed = rawProductSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  }),
);

export const productListResponseSchema = z.object({
  products: lenientProductArray,
  total: num(0),
  skip: num(0),
  limit: num(0),
});

export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const categoryListSchema = z
  .array(z.union([z.string(), z.object({ slug: z.string(), name: z.string() }).passthrough()]))
  .transform((items) =>
    items.map((item) => (typeof item === "string" ? { slug: item, name: item } : { slug: item.slug, name: item.name })),
  );

export const rawUserSchema = z.object({
  id: z.coerce.number(),
  firstName: str(""),
  lastName: str(""),
  email: str(""),
  phone: str(""),
  username: str(""),
  image: str(""),
  role: str("user"),
  address: z
    .object({ address: str(""), city: str(""), state: str(""), postalCode: str(""), country: str("") })
    .partial()
    .optional()
    .catch(undefined),
});

export type RawUser = z.infer<typeof rawUserSchema>;

export const userListResponseSchema = z.object({
  users: z.array(z.unknown()).transform((items) =>
    items.flatMap((item) => {
      const parsed = rawUserSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  ),
  total: num(0),
  skip: num(0),
  limit: num(0),
});

export const authLoginResponseSchema = rawUserSchema.extend({
  accessToken: z.string().optional(),
  token: z.string().optional(),
});
