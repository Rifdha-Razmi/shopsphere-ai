import type { UserRole } from "@/types";

/** Pages only customers use (shopping + personal account). Admins are sent to /admin instead. */
export const CUSTOMER_ONLY_PREFIXES = ["/cart", "/wishlist", "/checkout", "/account"];
export const ADMIN_PREFIX = "/admin";

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export const isCustomerOnlyPath = (path: string) => CUSTOMER_ONLY_PREFIXES.some((p) => matches(path, p));
export const isAdminPath = (path: string) => matches(path, ADMIN_PREFIX);

/**
 * Where a user lands after signing in (one login system, role-based landing):
 * - Admins always go to the admin dashboard (or the admin page they asked for).
 * - Customers go back to where they were, but never into /admin.
 */
export function homeForRole(role: UserRole, requested: string): string {
  if (role === "admin") return isAdminPath(requested) ? requested : ADMIN_PREFIX;
  return isAdminPath(requested) ? "/" : requested;
}
