import { describe, expect, it } from "vitest";
import { homeForRole, isAdminPath, isCustomerOnlyPath } from "@/lib/role-routing";

describe("role-based routing", () => {
  it("admins always land on the admin dashboard", () => {
    expect(homeForRole("admin", "/")).toBe("/admin");
    expect(homeForRole("admin", "/cart")).toBe("/admin");
    expect(homeForRole("admin", "/admin/orders")).toBe("/admin/orders");
  });
  it("customers return to where they were, never into /admin", () => {
    expect(homeForRole("customer", "/product/6")).toBe("/product/6");
    expect(homeForRole("customer", "/admin")).toBe("/");
  });
  it("classifies paths", () => {
    expect(isCustomerOnlyPath("/checkout")).toBe(true);
    expect(isCustomerOnlyPath("/account/orders")).toBe(true);
    expect(isCustomerOnlyPath("/products")).toBe(false);
    expect(isAdminPath("/admin/products/1")).toBe(true);
    expect(isAdminPath("/administrator")).toBe(false);
  });
});
