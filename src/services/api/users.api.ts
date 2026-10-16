import type { User } from "@/types";
import { buildUrl, request } from "./http";
import { authLoginResponseSchema, userListResponseSchema, type RawUser } from "./schemas";

export function normalizeUser(raw: RawUser): User {
  return {
    id: `dj_${raw.id}`,
    username: raw.username,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone,
    avatar: raw.image || null,
    role: raw.role === "admin" ? "admin" : "customer",
    source: "dummyjson",
  };
}

export interface CustomerRecord extends User {
  city: string;
  country: string;
}

export async function fetchUsers(params: { limit?: number; skip?: number } = {}, signal?: AbortSignal): Promise<{ users: CustomerRecord[]; total: number }> {
  const res = await request(buildUrl("/users", { limit: params.limit ?? 0, skip: params.skip ?? 0 }), { schema: userListResponseSchema, signal });
  return {
    total: res.total,
    users: res.users.map((u) => ({ ...normalizeUser(u), city: u.address?.city ?? "", country: u.address?.country ?? "" })),
  };
}

/** DummyJSON simulated auth (dev reference — PRD §10.2 / §11). */
export async function loginWithDummyJson(username: string, password: string, signal?: AbortSignal): Promise<User> {
  const res = await request(buildUrl("/auth/login"), {
    schema: authLoginResponseSchema,
    method: "POST",
    body: { username, password, expiresInMins: 30 },
    signal,
  });
  return normalizeUser(res);
}
